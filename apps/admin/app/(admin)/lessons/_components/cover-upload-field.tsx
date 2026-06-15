"use client";

import React, { useRef, useState, useTransition } from "react";
import { COVER_UPLOAD_ALLOWED_MIME } from "@cyberlearn/types";
import { importLessonCoverFromUrlAction, uploadLessonCoverAction } from "../_actions/cover-actions";

// ── Design tokens (match the lesson form) ───────────────────────────────────────
const BORDER = "#2A2560";
const DANGER = "#FF4D6D";
const TURQ = "#0AFFD4";
const MONO = "var(--font-mono)";

const btnBase: React.CSSProperties = {
  fontFamily: MONO,
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  padding: "10px 16px",
  border: `1px solid ${BORDER}`,
  background: "#0A0826",
  color: "#F5F5FA",
  whiteSpace: "nowrap",
  transition: "all 150ms ease",
};

/**
 * Cover image picker for the lesson create/edit forms. The admin can either
 * paste an image URL (re-hosted into the bucket) or upload a file. Both paths
 * store a `__cover:` marker in a hidden `coverImageUrl` field that the form
 * submits, and show a live preview.
 */
export function CoverUploadField({
  initialMarker,
  initialPreview,
}: {
  initialMarker: string | null;
  initialPreview: string | null;
}): React.ReactElement {
  const [marker, setMarker] = useState(initialMarker ?? "");
  const [preview, setPreview] = useState<string | null>(initialPreview);
  const [urlValue, setUrlValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTask] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function applyResult(res: {
    ok?: boolean;
    marker?: string;
    previewUrl?: string;
    error?: string;
  }): void {
    if (res.ok && res.marker) {
      setMarker(res.marker);
      setPreview(res.previewUrl ?? null);
      setUrlValue("");
    } else {
      setError(res.error ?? "Échec.");
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.set("cover", file);
    if (marker) fd.set("previous", marker);
    startTask(async () => {
      applyResult(await uploadLessonCoverAction({}, fd));
    });
  }

  function handleImportUrl(): void {
    const u = urlValue.trim();
    if (!u) return;
    setError(null);
    const fd = new FormData();
    fd.set("url", u);
    if (marker) fd.set("previous", marker);
    startTask(async () => {
      applyResult(await importLessonCoverFromUrlAction({}, fd));
    });
  }

  function handleRemove(): void {
    setMarker("");
    setPreview(null);
    setUrlValue("");
    setError(null);
  }

  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 14, flexWrap: "wrap" }}>
      <input type="hidden" name="coverImageUrl" value={marker} />
      <input
        ref={inputRef}
        type="file"
        accept={COVER_UPLOAD_ALLOWED_MIME.join(",")}
        onChange={handleFile}
        style={{ display: "none" }}
      />

      {/* Preview / placeholder, 16:9 */}
      <div
        style={{
          position: "relative",
          width: 176,
          aspectRatio: "16 / 9",
          flexShrink: 0,
          border: `1px solid ${BORDER}`,
          background: "#05041A",
          overflow: "hidden",
          display: "grid",
          placeItems: "center",
        }}
      >
        {preview ? (
          // Signed URL (private bucket): plain img, not next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Aperçu de la couverture"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: "0.16em",
              color: "#44406B",
              textTransform: "uppercase",
            }}
          >
            16 : 9
          </span>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 240 }}>
        {/* Option 1: paste a link */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="url"
            inputMode="url"
            value={urlValue}
            disabled={busy}
            placeholder="https://… (lien d'une image)"
            onChange={(e) => {
              setUrlValue(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                // Don't submit the parent lesson form; import the link instead.
                e.preventDefault();
                handleImportUrl();
              }
            }}
            style={{
              flex: 1,
              minWidth: 160,
              background: "#0A0826",
              border: `1px solid ${BORDER}`,
              color: "#F5F5FA",
              fontFamily: MONO,
              fontSize: 12,
              padding: "9px 12px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <button
            type="button"
            disabled={busy || urlValue.trim() === ""}
            onClick={handleImportUrl}
            style={{
              ...btnBase,
              borderColor: TURQ,
              cursor: busy || urlValue.trim() === "" ? "not-allowed" : "pointer",
              opacity: busy || urlValue.trim() === "" ? 0.6 : 1,
            }}
          >
            {busy ? "…" : "Utiliser le lien"}
          </button>
        </div>

        {/* Option 2: upload a file */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span
            style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", color: "#44406B" }}
          >
            OU
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            style={{
              ...btnBase,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "Envoi…" : preview ? "Remplacer le fichier" : "Importer un fichier"}
          </button>
          {preview && (
            <button
              type="button"
              disabled={busy}
              onClick={handleRemove}
              style={{
                ...btnBase,
                background: "transparent",
                color: DANGER,
                borderColor: "rgba(255,77,109,0.4)",
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              Retirer
            </button>
          )}
        </div>

        <span
          style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.04em", color: "#44406B" }}
        >
          JPEG, PNG ou WebP · 4 Mo max · 1280×720 recommandé · le lien est ré-hébergé
        </span>
        {error !== null && (
          <span style={{ fontFamily: MONO, fontSize: 10, color: DANGER }}>{error}</span>
        )}
      </div>
    </div>
  );
}
