"use client";

import React, { useCallback, useEffect, useRef } from "react";

interface VideoModalProps {
  open: boolean;
  onClose: () => void;
  /** Public path to the MP4, e.g. "/videos/launch.mp4". */
  src: string;
  poster?: string;
  /** Small label shown above the player. */
  eyebrow?: string;
  title?: string;
  /** Optional action row rendered below the player (buttons, links). */
  actions?: React.ReactNode;
}

/**
 * Accessible, self-contained video overlay. No external UI deps: dark blurred
 * backdrop, a framed autoplaying (muted) player, close on Escape / backdrop /
 * the close button. The videos ship without an audio track, so muted autoplay
 * is never blocked by the browser.
 */
export function VideoModal({
  open,
  onClose,
  src,
  poster,
  eyebrow,
  title,
  actions,
}: VideoModalProps): React.ReactElement | null {
  const closeRef = useRef<HTMLButtonElement>(null);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, handleKey]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Vidéo"}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "rgba(3,2,25,0.82)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        animation: "cl-video-fade 180ms ease",
      }}
    >
      <style>{`
        @keyframes cl-video-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cl-video-rise { from { opacity: 0; transform: translateY(14px) scale(0.985) } to { opacity: 1; transform: none } }
      `}</style>
      <div
        onClick={(e) => {
          e.stopPropagation();
        }}
        style={{
          width: "100%",
          maxWidth: 1040,
          background: "#0A0826",
          border: "1px solid #2A2560",
          boxShadow: "0 40px 120px rgba(0,0,0,0.6)",
          animation: "cl-video-rise 240ms cubic-bezier(0.2,0.7,0.2,1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "16px 20px",
            borderBottom: "1px solid #1F1B47",
          }}
        >
          <div style={{ minWidth: 0 }}>
            {eyebrow && (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#0AFFD4",
                  marginBottom: title ? 6 : 0,
                }}
              >
                {eyebrow}
              </div>
            )}
            {title && (
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 800,
                  fontSize: 18,
                  letterSpacing: "-0.02em",
                  color: "#F5F5FA",
                }}
              >
                {title}
              </div>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              background: "transparent",
              border: "1px solid #2A2560",
              color: "#B8B5D1",
              cursor: "pointer",
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M3 3 L13 13 M13 3 L3 13" />
            </svg>
          </button>
        </div>

        <video
          src={src}
          poster={poster}
          autoPlay
          muted
          playsInline
          controls
          aria-label={title ?? "Vidéo de présentation"}
          style={{ display: "block", width: "100%", background: "#030219" }}
        />

        {actions && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
              padding: "16px 20px",
              borderTop: "1px solid #1F1B47",
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
