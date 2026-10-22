"use client";

import React, { useRef, useState, useTransition } from "react";
import { COVER_UPLOAD_ALLOWED_MIME } from "@cyberlearn/types";
import { importLessonCoverFromUrlAction, uploadLessonCoverAction } from "../_actions/cover-actions";

const MONO = "var(--font-mono)";

const btnBase: React.CSSProperties = {
  fontFamily: MONO,
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  padding: "10px 16px",
  border: "1px solid var(--a-border-2)",
  background: "var(--a-surface)",
  color: "var(--a-fg)",
  whiteSpace: "nowrap",
  transition: "all 150ms ease",
};

/**
 * Cover image picker for the lesson and path create/edit forms. The admin can either
 * paste an image URL (re-hosted into the bucket) or upload a file. Both paths
 * store a `__cover:` marker in a hidden `coverImageUrl` field that the form
 * submits, and show a live preview.
 *
 * The lesson studio has no form to submit: it hears each change through
 * `onChange`, and passes `keepPrevious`, since the cover it replaces is still
 * the published lesson's, or a past version's, until a publish says otherwise.
 */
export function CoverUploadField({
  initialMarker,
  initialPreview,
  onChange,
  keepPrevious = false,
}: {
  initialMarker: string | null;
  initialPreview: string | null;
  /** Each new marker, "" once the cover is removed, with the preview it shows for it. */
  onChange?: (marker: string, preview: string | null) => void;
  /** Never removes the cover it replaces from the bucket. */
  keepPrevious?: boolean;
}): React.ReactElement {
  const [marker, setMarkerState] = useState(initialMarker ?? "");
  const [preview, setPreviewState] = useState<string | null>(initialPreview);
  const setCover = (next: string, nextPreview: string | null): void => {
    setMarkerState(next);
    setPreviewState(nextPreview);
    onChange?.(next, nextPreview);
  };
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
      setCover(res.marker, res.previewUrl ?? null);
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
    if (marker && !keepPrevious) fd.set("previous", marker);
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
    if (marker && !keepPrevious) fd.set("previous", marker);
    startTask(async () => {
      applyResult(await importLessonCoverFromUrlAction({}, fd));
    });
  }

  function handleRemove(): void {
    setCover("", null);
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
          border: "1px solid var(--a-border-2)",
          background: "var(--a-surface-2)",
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
              color: "var(--a-muted)",
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
              background: "var(--a-surface)",
              border: "1px solid var(--a-border-2)",
              color: "var(--a-fg)",
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
              borderColor: "var(--a-accent)",
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
            style={{
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: "0.16em",
              color: "var(--a-muted)",
            }}
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
                color: "var(--a-danger)",
                borderColor: "color-mix(in srgb, var(--a-danger) 40%, transparent)",
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              Retirer
            </button>
          )}
        </div>

        <span
          style={{
            fontFamily: MONO,
            fontSize: 10.5,
            letterSpacing: "0.04em",
            color: "var(--a-muted)",
          }}
        >
          JPEG, PNG ou WebP · 4 Mo max · 1280×720 recommandé · le lien est ré-hébergé
        </span>
        {error !== null && (
          <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--a-danger)" }}>{error}</span>
        )}
      </div>
    </div>
  );
}
