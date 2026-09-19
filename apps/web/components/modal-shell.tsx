"use client";

import React, { useCallback, useEffect, useRef } from "react";

/**
 * The overlay every pop-up on the site is made of.
 *
 * It was extracted from the intro video's modal, which had grown the whole
 * behaviour a dialog needs - close on Escape, close on the backdrop, lock the
 * page behind it, put focus somewhere sensible on open - written inline. A
 * second pop-up wanting the same thing had two options: import that one and
 * pretend a recap is a video, or copy the behaviour. This is the third.
 *
 * It owns the chrome and the behaviour; what goes inside is the caller's.
 */
export interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  /** Small mono label above the title. */
  eyebrow?: string;
  title?: string;
  /** Spoken name, when the visible title is not the whole story. */
  ariaLabel?: string;
  /** Action row under the body. Omitted, no row is drawn. */
  actions?: React.ReactNode;
  /** Defaults to the video's width, which is the widest thing shown so far. */
  maxWidth?: number;
  /**
   * The body sits directly against the header by default, which is what a
   * video wants and what a page of content does not.
   */
  bodyPadding?: string;
  children: React.ReactNode;
}

export function ModalShell({
  open,
  onClose,
  eyebrow,
  title,
  ariaLabel,
  actions,
  maxWidth = 1040,
  bodyPadding,
  children,
}: ModalShellProps): React.ReactElement | null {
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
      aria-label={ariaLabel ?? title ?? "Fenêtre"}
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
        animation: "cl-modal-fade 180ms ease",
      }}
    >
      <style>{`
        @keyframes cl-modal-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cl-modal-rise { from { opacity: 0; transform: translateY(14px) scale(0.985) } to { opacity: 1; transform: none } }
      `}</style>
      <div
        onClick={(e) => {
          e.stopPropagation();
        }}
        style={{
          width: "100%",
          maxWidth,
          // A recap is taller than a video and the viewport is what it is, so
          // the panel stops at the screen and scrolls its own body.
          maxHeight: "calc(100vh - 48px)",
          display: "flex",
          flexDirection: "column",
          background: "#0A0826",
          border: "1px solid #2A2560",
          boxShadow: "0 40px 120px rgba(0,0,0,0.6)",
          animation: "cl-modal-rise 240ms cubic-bezier(0.2,0.7,0.2,1)",
        }}
      >
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "16px 20px",
            borderBottom: "1px solid #1F1B47",
          }}
        >
          <div style={{ minWidth: 0 }}>
            {eyebrow !== undefined && (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--cosmetic-accent)",
                  marginBottom: title !== undefined ? 6 : 0,
                }}
              >
                {eyebrow}
              </div>
            )}
            {title !== undefined && (
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

        <div style={{ minHeight: 0, overflowY: "auto", padding: bodyPadding }}>{children}</div>

        {actions !== undefined && (
          <div
            style={{
              flexShrink: 0,
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
