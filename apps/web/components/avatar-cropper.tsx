"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  AVATAR_EXPORT_PX,
  AVATAR_UPLOAD_ALLOWED_MIME,
  AVATAR_UPLOAD_ERROR,
} from "@cyberlearn/types";
import { ModalShell } from "@cyberlearn/ui";
import "./community-workspace.css";
import "./avatar-cropper.css";

const VIEWPORT = 280; // on-screen crop square (px)
const OUTPUT = AVATAR_EXPORT_PX; // exported avatar size (px), the app's too
const MAX_ZOOM = 4;
const previewFileSchema = z.object({
  type: z.enum(AVATAR_UPLOAD_ALLOWED_MIME, { error: AVATAR_UPLOAD_ERROR.format }),
  size: z.number().positive(AVATAR_UPLOAD_ERROR.empty),
});

interface Offset {
  x: number;
  y: number;
}

/**
 * In-place avatar cropper: pan (drag) + zoom (slider) over a square viewport
 * then export the visible square as a Blob. No external
 * dependency - the crop is rasterized with a canvas. Exports WebP (falls back to
 * JPEG) so the result stays small and within the upload validation allowlist.
 */
export function AvatarCropper({
  file,
  busy = false,
  onCancel,
  onConfirm,
}: {
  file: File;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}): React.JSX.Element {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    let disposed = false;
    let bitmap: ImageBitmap | null = null;
    setNatural(null);
    setError(null);
    setZoom(1);
    drag.current = null;

    const validated = previewFileSchema.safeParse({ type: file.type, size: file.size });
    if (!validated.success) {
      setError(validated.error.issues[0]?.message ?? AVATAR_UPLOAD_ERROR.content);
      return;
    }

    // Decode to pixels without exposing the selected file through a DOM URL.
    async function loadPreview(): Promise<void> {
      try {
        const decoded = await createImageBitmap(file);
        if (disposed) {
          decoded.close();
          return;
        }
        bitmap = decoded;
        bitmapRef.current = decoded;
        const ds = Math.max(VIEWPORT / decoded.width, VIEWPORT / decoded.height);
        setOffset({
          x: (VIEWPORT - decoded.width * ds) / 2,
          y: (VIEWPORT - decoded.height * ds) / 2,
        });
        setNatural({ w: decoded.width, h: decoded.height });
      } catch {
        if (!disposed) setError(AVATAR_UPLOAD_ERROR.content);
      }
    }
    void loadPreview();

    return () => {
      disposed = true;
      bitmap?.close();
      if (bitmapRef.current === bitmap) bitmapRef.current = null;
    };
  }, [file]);

  const baseScale = natural ? Math.max(VIEWPORT / natural.w, VIEWPORT / natural.h) : 1;
  const displayScale = baseScale * zoom;

  useEffect(() => {
    const ctx = previewRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, VIEWPORT, VIEWPORT);
    if (natural && bitmapRef.current) {
      ctx.drawImage(
        bitmapRef.current,
        offset.x,
        offset.y,
        natural.w * displayScale,
        natural.h * displayScale,
      );
    }
  }, [natural, offset, displayScale]);

  // Keep the image fully covering the viewport (no empty edges).
  const clamp = useCallback(
    (o: Offset, ds: number): Offset => {
      if (!natural) return o;
      const w = natural.w * ds;
      const h = natural.h * ds;
      return {
        x: Math.min(0, Math.max(VIEWPORT - w, o.x)),
        y: Math.min(0, Math.max(VIEWPORT - h, o.y)),
      };
    },
    [natural],
  );

  function handleZoom(nextZoom: number): void {
    if (!natural) return;
    const oldDs = baseScale * zoom;
    const newDs = baseScale * nextZoom;
    // Keep the viewport center anchored on the same image point while zooming.
    const ix = (VIEWPORT / 2 - offset.x) / oldDs;
    const iy = (VIEWPORT / 2 - offset.y) / oldDs;
    const next = clamp({ x: VIEWPORT / 2 - ix * newDs, y: VIEWPORT / 2 - iy * newDs }, newDs);
    setZoom(nextZoom);
    setOffset(next);
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>): void {
    if (!natural || busy) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>): void {
    if (!drag.current) return;
    const d = drag.current;
    setOffset(clamp({ x: d.ox + (e.clientX - d.px), y: d.oy + (e.clientY - d.py) }, displayScale));
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>): void {
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function handleConfirm(): void {
    if (busy || !natural || !bitmapRef.current) return;
    const ds = displayScale;
    const sx = -offset.x / ds;
    const sy = -offset.y / ds;
    const sSize = VIEWPORT / ds;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(bitmapRef.current, sx, sy, sSize, sSize, 0, 0, OUTPUT, OUTPUT);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onConfirm(blob);
          return;
        }
        canvas.toBlob(
          (jpeg) => {
            if (jpeg) onConfirm(jpeg);
          },
          "image/jpeg",
          0.9,
        );
      },
      "image/webp",
      0.9,
    );
  }

  const actions = (
    <>
      <button
        className="btn btn--ghost"
        type="button"
        onClick={onCancel}
        disabled={busy}
        style={{
          flex: "0 0 auto",
        }}
      >
        Annuler
      </button>
      <button
        className="btn"
        type="button"
        onClick={handleConfirm}
        disabled={busy || !natural}
        style={{
          flex: 1,
          opacity: busy || !natural ? 0.6 : 1,
        }}
      >
        {busy ? "Envoi…" : "Valider"}
      </button>
    </>
  );

  // The upload in flight is not something to walk away from: Escape and the
  // backdrop wait for it, the buttons say so.
  return (
    <ModalShell
      open
      onClose={onCancel}
      dismissable={!busy}
      title="Recadrer l'avatar"
      className="community-dialog avatar-cropper"
      maxWidth={400}
      actions={actions}
    >
      <div className="avatar-cropper__content">
        {/* Crop viewport */}
        <div
          className="card card--sunken"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            position: "relative",
            width: VIEWPORT,
            height: VIEWPORT,
            maxWidth: "100%",
            margin: "0 auto",
            overflow: "hidden",
            cursor: drag.current ? "grabbing" : "grab",
            touchAction: "none",
          }}
        >
          <canvas
            ref={previewRef}
            width={VIEWPORT}
            height={VIEWPORT}
            role="img"
            aria-label="Aperçu du recadrage de l'avatar"
            style={{ display: "block", pointerEvents: "none" }}
          />
        </div>

        {error ? (
          <p role="alert">{error}</p>
        ) : !natural ? (
          <p role="status">Chargement de l’image…</p>
        ) : null}

        {/* Zoom */}
        <label
          className="mono-label"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            margin: "16px 0 4px",
            color: "#c2bfb8",
          }}
        >
          Zoom
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={busy || !natural}
            onChange={(e) => {
              handleZoom(Number(e.target.value));
            }}
            style={{ flex: 1, accentColor: "var(--cosmetic-accent)" }}
          />
        </label>

        <p
          style={{
            fontFamily: "var(--font-interface)",
            fontSize: 12,
            color: "#aaa79f",
            margin: "4px 0 14px",
          }}
        >
          Glisse l&apos;image pour la repositionner.
        </p>
      </div>
    </ModalShell>
  );
}
