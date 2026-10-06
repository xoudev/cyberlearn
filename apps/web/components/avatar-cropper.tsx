"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AVATAR_EXPORT_PX } from "@cyberlearn/types";
import { ModalShell } from "@/components/modal-shell";

const VIEWPORT = 280; // on-screen crop square (px)
const OUTPUT = AVATAR_EXPORT_PX; // exported avatar size (px), the app's too
const MAX_ZOOM = 4;

interface Offset {
  x: number;
  y: number;
}

/**
 * In-place avatar cropper: pan (drag) + zoom (slider) over a square viewport
 * with a circular guide, then export the visible square as a Blob. No external
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
  const [imgUrl, setImgUrl] = useState("");
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const baseScale = natural ? Math.max(VIEWPORT / natural.w, VIEWPORT / natural.h) : 1;
  const displayScale = baseScale * zoom;

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

  function handleImgLoad(e: React.SyntheticEvent<HTMLImageElement>): void {
    const el = e.currentTarget;
    const n = { w: el.naturalWidth, h: el.naturalHeight };
    setNatural(n);
    const ds = Math.max(VIEWPORT / n.w, VIEWPORT / n.h);
    setOffset({ x: (VIEWPORT - n.w * ds) / 2, y: (VIEWPORT - n.h * ds) / 2 });
  }

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
    if (!natural || !imgRef.current) return;
    const ds = displayScale;
    const sx = -offset.x / ds;
    const sy = -offset.y / ds;
    const sSize = VIEWPORT / ds;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(imgRef.current, sx, sy, sSize, sSize, 0, 0, OUTPUT, OUTPUT);
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
      maxWidth={360}
      actions={actions}
    >
      <div style={{ padding: "20px 24px 4px" }}>
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
          {imgUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={imgUrl}
              alt=""
              onLoad={handleImgLoad}
              draggable={false}
              style={{
                position: "absolute",
                left: offset.x,
                top: offset.y,
                width: natural ? natural.w * displayScale : "auto",
                height: natural ? natural.h * displayScale : "auto",
                maxWidth: "none",
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          )}
          {/* Circular guide (preview of the round avatar crop) */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              boxShadow: "0 0 0 9999px rgba(2,1,12,0.55)",
              border: "1px solid color-mix(in srgb, var(--cosmetic-accent) 60%, transparent)",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Zoom */}
        <label
          className="mono-label"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            margin: "16px 0 4px",
            color: "#7F7BA9",
          }}
        >
          Zoom
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => {
              handleZoom(Number(e.target.value));
            }}
            style={{ flex: 1, accentColor: "var(--cosmetic-accent)" }}
          />
        </label>

        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "#44406B",
            margin: "4px 0 14px",
          }}
        >
          Glisse l&apos;image pour la repositionner.
        </p>
      </div>
    </ModalShell>
  );
}
