"use client";

// Canvas export and the browser's share sheet require client APIs.
import React, { useState } from "react";
import type { WrappedPayload } from "@cyberlearn/lib";
import { WRAPPED_CARD_SIZE, wrappedCardContent } from "@cyberlearn/lib/gamification/wrapped-card";
import { BASTION_MARK_PATHS, BastionLogo } from "@/components/bastion-logo";
import "./wrapped.css";

const TIER_LABEL: Record<string, string> = {
  BRONZE: "Bronze",
  ARGENT: "Argent",
  OR: "Or",
  PLATINE: "Platine",
  DIAMANT: "Diamant",
  ELITE: "Élite",
};

function topPercent(rank: number, total: number): number {
  if (total <= 0) return 100;
  return Math.max(1, Math.round((rank / total) * 100));
}

function FinalCard({
  payload,
  handle,
}: {
  payload: WrappedPayload;
  handle: string;
}): React.JSX.Element {
  const card = wrappedCardContent(payload, handle);
  const season = payload.season;
  const pct =
    season?.globalRank != null ? topPercent(season.globalRank, season.totalMembers) : null;
  return (
    <article className="wrapped-card" aria-label="Ta carte récapitulative">
      <header className="wrapped-brand">
        <BastionLogo size={28} />
        <span>CyberLearn / Wrapped</span>
      </header>
      <h2>{card.year}</h2>
      <p className="wrapped-card__caption">Ton année de pratique</p>
      <dl className="wrapped-card__stats">
        {card.stats.map(({ value, label }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {card.domain !== null && <p className="wrapped-card__domain">{card.domain}</p>}
      {season?.globalRank != null && (
        <p className="wrapped-card__season">
          Rang #{season.globalRank}
          {pct !== null && <span> · Top {pct}%</span>}
          <small>
            Division {TIER_LABEL[season.division] ?? season.division} · saison{" "}
            {String(season.seasonIndex).padStart(2, "0")}
          </small>
        </p>
      )}
      <footer>
        <strong>{card.handle}</strong>
        <span>{card.site}</span>
      </footer>
    </article>
  );
}

/** Draws the shared card content at a fixed size, with the existing brand paths. */
function drawStoryCard(payload: WrappedPayload, handle: string): HTMLCanvasElement {
  const card = wrappedCardContent(payload, handle);
  const canvas = document.createElement("canvas");
  canvas.width = WRAPPED_CARD_SIZE.width;
  canvas.height = WRAPPED_CARD_SIZE.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const bodyStyle = getComputedStyle(document.body);
  const displayFont =
    bodyStyle.getPropertyValue("--font-display").trim() || "'Barlow Condensed', sans-serif";
  const textFont =
    bodyStyle.getPropertyValue("--font-interface").trim() || "'Space Grotesk', sans-serif";

  ctx.fillStyle = "#0b0c0e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(72, 84);
  ctx.scale(76 / 256, 76 / 256);
  for (const [part, path] of Object.entries(BASTION_MARK_PATHS)) {
    ctx.fillStyle = part === "top" || part === "core" ? "#ff6b2b" : "#f4f2ed";
    ctx.fill(new Path2D(path));
  }
  ctx.restore();
  ctx.textAlign = "left";
  ctx.fillStyle = "#f4f2ed";
  ctx.font = `700 48px ${displayFont}`;
  ctx.fillText(card.title, 170, 142, 838);
  ctx.font = `700 280px ${displayFont}`;
  ctx.fillText(card.year, 72, 420, 936);
  ctx.fillStyle = "#aaa79f";
  ctx.font = `32px ${textFont}`;
  ctx.fillText("Ton année de pratique", 72, 480, 936);

  ctx.fillStyle = "#eae7df";
  ctx.fillRect(72, 580, 936, 620);
  ctx.strokeStyle = "#bdbab3";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(540, 580);
  ctx.lineTo(540, 1200);
  ctx.moveTo(72, 890);
  ctx.lineTo(1008, 890);
  ctx.stroke();
  ctx.textAlign = "center";
  card.stats.forEach(({ value, label }, index) => {
    const x = index % 2 === 0 ? 306 : 774;
    const y = index < 2 ? 780 : 1090;
    ctx.fillStyle = "#141518";
    ctx.font = `700 128px ${displayFont}`;
    ctx.fillText(value, x, y, 388);
    ctx.fillStyle = "#55524d";
    ctx.font = `32px ${textFont}`;
    ctx.fillText(label, x, y + 60, 388);
  });
  ctx.textAlign = "left";
  if (card.domain !== null) {
    ctx.fillStyle = "#c2bfb8";
    ctx.font = `32px ${textFont}`;
    ctx.fillText(card.domain, 72, 1280, 936);
  }
  ctx.fillStyle = "#f4f2ed";
  ctx.font = `38px ${textFont}`;
  ctx.fillText(card.handle, 72, 1380, 936);
  ctx.strokeStyle = "#44454a";
  ctx.beginPath();
  ctx.moveTo(72, 1440);
  ctx.lineTo(1008, 1440);
  ctx.stroke();
  ctx.fillStyle = "#aaa79f";
  ctx.font = `30px ${textFont}`;
  ctx.fillText(card.site, 72, 1520, 936);
  return canvas;
}

function ExportPanel({
  payload,
  handle,
}: {
  payload: WrappedPayload;
  handle: string;
}): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const toBlob = async (): Promise<Blob | null> => {
    await document.fonts.ready;
    return new Promise((resolve) => {
      drawStoryCard(payload, handle).toBlob(resolve, "image/png");
    });
  };

  const download = (): void => {
    setFailed(null);
    setBusy(true);
    void toBlob()
      .then((blob) => {
        if (!blob) {
          setFailed("L'image n'a pas pu être générée.");
          return;
        }
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = wrappedCardContent(payload, handle).fileName;
        anchor.click();
        // Let the browser consume the download URL before releasing it.
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 0);
      })
      .catch(() => {
        setFailed("L'image n'a pas pu être générée.");
      })
      .finally(() => {
        setBusy(false);
      });
  };

  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [new File([], "x.png", { type: "image/png" })] });

  const share = (): void => {
    setFailed(null);
    setBusy(true);
    void toBlob()
      .then(async (blob) => {
        if (!blob) {
          setFailed("L'image n'a pas pu être générée.");
          return;
        }
        const file = new File([blob], wrappedCardContent(payload, handle).fileName, {
          type: "image/png",
        });
        try {
          await navigator.share({ files: [file], title: "Mon CyberLearn Wrapped" });
        } catch {
          /* Closing the native share sheet is not an export failure. */
        }
      })
      .catch(() => {
        setFailed("L'image n'a pas pu être générée.");
      })
      .finally(() => {
        setBusy(false);
      });
  };

  return (
    <div className="wrapped-export" aria-busy={busy}>
      <p>Garder ton récap</p>
      <button type="button" className="wrapped-export__primary" disabled={busy} onClick={download}>
        {busy ? "Génération…" : "Télécharger l’image"}
      </button>
      {canShare && (
        <button type="button" disabled={busy} onClick={share}>
          Partager l’image
        </button>
      )}
      {failed !== null ? (
        <p className="wrapped-export__error" role="alert">
          {failed}
        </p>
      ) : (
        <small>Image 1080 × 1920.</small>
      )}
    </div>
  );
}

export function WrappedShare({
  payload,
  handle,
}: {
  payload: WrappedPayload | null;
  handle: string;
}): React.JSX.Element {
  if (!payload) return <p className="ws-lead">Ton récap n’est pas encore disponible.</p>;
  return (
    <div className="wrapped-share">
      <FinalCard payload={payload} handle={handle} />
      <ExportPanel payload={payload} handle={handle} />
    </div>
  );
}
