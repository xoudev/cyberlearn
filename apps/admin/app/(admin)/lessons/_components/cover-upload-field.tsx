"use client";

import React, { useRef, useState, useTransition } from "react";
import { COVER_UPLOAD_ALLOWED_MIME } from "@cyberlearn/types";
import { uploadLessonCoverAction } from "../_actions/cover-actions";

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
  transition: "all 150ms ease",
};

/**
 * Cover image picker for the lesson create/edit forms. Uploads to the private
 * "lesson-covers" bucket via a server action and writes the resulting
 * `__cover:` marker into a hidden `coverImageUrl` field that the form submits.
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
  const [error, setError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.set("cover", file);
    if (marker) fd.set("previous", marker);
    startUpload(async () => {
      const res = await uploadLessonCoverAction({}, fd);
      if (res.ok && res.marker) {
        setMarker(res.marker);
        setPreview(res.previewUrl ?? null);
      } else {
        setError(res.error ?? "Échec de l'envoi.");
      }
    });
  }

  function handleRemove(): void {
    setMarker("");
    setPreview(null);
    setError(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="coverImageUrl" value={marker} />
      <input
        ref={inputRef}
        type="file"
        accept={COVER_UPLOAD_ALLOWED_MIME.join(",")}
        onChange={handleFile}
        style={{ display: "none" }}
      />
      <div style={{ display: "flex", alignItems: "stretch", gap: 14, flexWrap: "wrap" }}>
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

        <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              style={{
                ...btnBase,
                cursor: uploading ? "not-allowed" : "pointer",
                opacity: uploading ? 0.6 : 1,
                color: uploading ? "#6B6890" : "#F5F5FA",
                borderColor: TURQ,
              }}
            >
              {uploading ? "Envoi…" : preview ? "Remplacer" : "Importer une image"}
            </button>
            {preview && (
              <button
                type="button"
                disabled={uploading}
                onClick={handleRemove}
                style={{
                  ...btnBase,
                  background: "transparent",
                  color: DANGER,
                  borderColor: "rgba(255,77,109,0.4)",
                  cursor: uploading ? "not-allowed" : "pointer",
                }}
              >
                Retirer
              </button>
            )}
          </div>
          <span
            style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.04em", color: "#44406B" }}
          >
            JPEG, PNG ou WebP · 4 Mo max · 1280×720 recommandé
          </span>
          {error !== null && (
            <span style={{ fontFamily: MONO, fontSize: 10, color: DANGER }}>{error}</span>
          )}
        </div>
      </div>
    </div>
  );
}
