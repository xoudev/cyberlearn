"use client";

import { ACCENT, MONO, RED } from "@cyberlearn/ui";
import React, { useState } from "react";
import { parsePhotoOsint } from "@cyberlearn/types";
import { distanceKm, distanceLabel, parseCoordinates, type Point } from "@/lib/osint/geo";
import { type MetadataRow, readMetadata } from "@/lib/osint/metadata";
import { OsintMap } from "./osint-map";

/**
 * <PhotoOsint>: a photo, its real metadata read from its bytes (exifr, in the
 * browser, as an investigator's tool would), and a map to place where it was
 * taken. Once found, the photo is cleaned the way a careful sharer would and
 * read again: nothing left. Client-side because the reading, the map and the
 * cleaning all happen in the learner's browser; nothing is sent anywhere.
 */

/**
 * The photo drawn again on a canvas and saved as a new JPEG: the pixels stay,
 * the metadata does not, as with a sharing app that strips it.
 */
async function cleanedBytes(src: string): Promise<ArrayBuffer> {
  const image = new Image();
  image.src = src;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.getContext("2d")?.drawImage(image, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.9);
  });
  if (blob === null) throw new Error("canvas");
  return blob.arrayBuffer();
}

function MetadataTable({ rows }: { rows: readonly MetadataRow[] }): React.ReactElement {
  if (rows.length === 0) {
    return (
      <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14 }}>
        Aucune métadonnée : ni appareil, ni date, ni position.
      </p>
    );
  }
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.tag} style={{ borderTop: "1px solid #1F1B47" }}>
            <th
              scope="row"
              style={{
                textAlign: "left",
                fontWeight: 400,
                color: "#B8B5D1",
                padding: "6px 8px 6px 0",
              }}
            >
              {row.label}
              <span style={{ display: "block", fontFamily: MONO, fontSize: 11, color: "#5A5680" }}>
                {row.tag}
              </span>
            </th>
            <td
              style={{
                fontFamily: MONO,
                color: row.tag.startsWith("GPS") ? ACCENT : "#F5F5FA",
                padding: "6px 0",
                overflowWrap: "anywhere",
              }}
            >
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function PhotoOsint(props: Record<string, unknown>): React.ReactElement {
  const parsed = parsePhotoOsint(props);
  const [rows, setRows] = useState<MetadataRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [readError, setReadError] = useState(false);
  const [guess, setGuess] = useState<Point | null>(null);
  const [typed, setTyped] = useState("");
  const [typedWrong, setTypedWrong] = useState(false);
  const [verdict, setVerdict] = useState<{ found: boolean; km: number } | null>(null);
  const [misses, setMisses] = useState(0);
  const [cleaned, setCleaned] = useState<MetadataRow[] | null>(null);

  if (!parsed.ok) {
    return (
      <div
        role="note"
        style={{ margin: "24px 0", padding: "14px 16px", border: `1px solid ${RED}` }}
      >
        Exercice OSINT indisponible : {parsed.problem}
      </div>
    );
  }
  const exercise = parsed.value;
  const answer: Point = {
    latitude: exercise.answer.latitude,
    longitude: exercise.answer.longitude,
  };
  const found = verdict?.found === true;

  const read = async (): Promise<void> => {
    setBusy(true);
    setReadError(false);
    try {
      const response = await fetch(exercise.src);
      if (!response.ok) throw new Error(String(response.status));
      setRows(await readMetadata(await response.arrayBuffer()));
    } catch {
      setReadError(true);
    } finally {
      setBusy(false);
    }
  };

  const place = (point: Point): void => {
    if (found) return;
    setGuess(point);
    setVerdict(null);
  };

  const placeTyped = (event: React.SyntheticEvent): void => {
    event.preventDefault();
    const point = parseCoordinates(typed);
    setTypedWrong(point === null);
    if (point !== null) place(point);
  };

  const check = (): void => {
    if (guess === null) return;
    const km = distanceKm(guess, answer);
    const ok = km <= exercise.answer.radiusKm;
    setVerdict({ found: ok, km });
    if (!ok) setMisses((m) => m + 1);
  };

  const clean = async (): Promise<void> => {
    setBusy(true);
    try {
      setCleaned(await readMetadata(await cleanedBytes(exercise.src)));
    } catch {
      setCleaned([]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="card card--sunken"
      aria-label={`Exercice OSINT${exercise.title ? ` : ${exercise.title}` : ""}`}
      style={{
        margin: "28px 0",
        borderTop: `2px solid ${ACCENT}`,
      }}
    >
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #1F1B47",
          display: "flex",
          gap: 10,
          alignItems: "baseline",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", color: ACCENT }}>
          OSINT · PHOTO
        </span>
        {exercise.title ? (
          <span style={{ color: "#F5F5FA", fontWeight: 600, fontSize: 15 }}>{exercise.title}</span>
        ) : null}
      </header>

      <div style={{ padding: "12px 16px", display: "grid", gap: 14 }}>
        <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14 }}>{exercise.task}</p>

        <figure style={{ margin: 0, display: "grid", gap: 6 }}>
          {/* A static picture of public/osint, read byte for byte below: next/image would re-encode it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={exercise.src}
            alt={exercise.alt}
            style={{ width: "100%", height: "auto", display: "block", border: "1px solid #1F1B47" }}
          />
          {exercise.caption ? (
            <figcaption style={{ color: "#D8D6EA", fontSize: 14 }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: "#7F7BA9", marginRight: 8 }}>
                LÉGENDE QUI CIRCULE
              </span>
              « {exercise.caption} »
            </figcaption>
          ) : null}
        </figure>

        <div style={{ display: "grid", gap: 8 }}>
          {rows === null ? (
            <button
              type="button"
              onClick={() => void read()}
              disabled={busy}
              className="btn btn--accent btn--sm"
              style={{ justifySelf: "start" }}
            >
              {busy ? "Lecture…" : "Lire les métadonnées (EXIF)"}
            </button>
          ) : (
            <div aria-live="polite" style={{ display: "grid", gap: 6 }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: "#7F7BA9" }}>
                MÉTADONNÉES DU FICHIER
              </span>
              <MetadataTable rows={rows} />
            </div>
          )}
          {readError ? (
            <p style={{ margin: 0, color: RED, fontSize: 14 }}>
              La photo n&apos;a pas pu être lue. Recharge la page et réessaie.
            </p>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <OsintMap guess={guess} truth={found ? answer : null} onPick={place} />
          <form onSubmit={placeTyped} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value);
              }}
              disabled={found}
              aria-label="Coordonnées du point"
              aria-invalid={typedWrong}
              placeholder={`45.76, 4.83  ou  45° 45' 44" N 4° 49' 37" E`}
              spellCheck={false}
              style={{
                flex: "1 1 220px",
                minWidth: 0,
                padding: "8px 10px",
                background: "#0A0826",
                border: `1px solid ${typedWrong ? RED : "#2A2560"}`,
                color: "#D8D6EA",
                fontFamily: MONO,
                fontSize: 13,
              }}
            />
            <button type="submit" disabled={found} className="btn btn--ghost btn--sm">
              Placer
            </button>
          </form>
          {typedWrong ? (
            <p style={{ margin: 0, color: RED, fontSize: 13 }}>
              Coordonnées illisibles : latitude puis longitude, en décimal ou en degrés, minutes,
              secondes.
            </p>
          ) : null}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 12, color: "#7F7BA9" }}>
              {guess === null
                ? "Pas encore de point : clique sur la carte."
                : `Ton point : ${guess.latitude.toFixed(4)}, ${guess.longitude.toFixed(4)}`}
            </span>
            <button
              type="button"
              onClick={check}
              disabled={guess === null || found}
              className="btn btn--accent btn--sm"
              style={{ marginLeft: "auto" }}
            >
              Valider ce lieu
            </button>
          </div>
        </div>

        <div aria-live="polite" style={{ display: "grid", gap: 8 }}>
          {verdict !== null && found ? (
            <>
              <p style={{ margin: 0, color: ACCENT, fontSize: 14 }}>
                ✓ Trouvé : {exercise.place}. Ton point est à {distanceLabel(verdict.km)} du lieu de
                prise de vue.
              </p>
              {exercise.conclusion ? (
                <p style={{ margin: 0, color: "#D8D6EA", fontSize: 14 }}>{exercise.conclusion}</p>
              ) : null}
            </>
          ) : null}
          {verdict !== null && !found ? (
            <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14 }}>
              Pas là : ton point est à {distanceLabel(verdict.km)} du lieu de prise de vue.
            </p>
          ) : null}
          {!found && misses >= 2 && exercise.hints && exercise.hints.length > 0 ? (
            <ol style={{ margin: 0, paddingLeft: 22, display: "grid", gap: 4 }}>
              {exercise.hints.map((hint) => (
                <li key={hint} style={{ color: "#B8B5D1", fontSize: 13 }}>
                  {hint}
                </li>
              ))}
            </ol>
          ) : null}
        </div>

        {found ? (
          <div style={{ display: "grid", gap: 8, borderTop: "1px solid #1F1B47", paddingTop: 12 }}>
            {cleaned === null ? (
              <>
                <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14 }}>
                  Et si la photo avait été nettoyée avant d&apos;être partagée ?
                </p>
                <button
                  type="button"
                  onClick={() => void clean()}
                  disabled={busy}
                  className="btn btn--ghost btn--sm"
                  style={{ justifySelf: "start" }}
                >
                  {busy ? "Nettoyage…" : "Nettoyer la photo, puis relire ses métadonnées"}
                </button>
              </>
            ) : (
              <div aria-live="polite" style={{ display: "grid", gap: 6 }}>
                <span style={{ fontFamily: MONO, fontSize: 11, color: "#7F7BA9" }}>
                  APRÈS NETTOYAGE
                </span>
                <MetadataTable rows={cleaned} />
                <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14 }}>
                  L&apos;image est la même ; seules les informations cachées ont disparu. C&apos;est
                  ce que fait exiftool -all= photo.jpg, ou une application qui retire la position
                  avant l&apos;envoi.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
