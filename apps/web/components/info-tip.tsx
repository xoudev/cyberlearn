"use client";

import React, { useEffect, useId, useRef, useState } from "react";

interface InfoTipProps {
  /** Optional bold heading shown above the body. */
  title?: string;
  children: React.ReactNode;
}

const MONO = "var(--font-mono)";
const SANS = "var(--font-sans)";

/**
 * Reusable "i" affordance with an explanatory popover.
 *
 * Accessibility: the trigger is a real focusable button with aria-label and
 * aria-expanded; the popover has role="tooltip" and is linked via
 * aria-describedby while visible. It opens on click (keyboard/touch friendly)
 * and on hover, and closes on Escape or an outside click.
 */
export function InfoTip({ title, children }: InfoTipProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const popId = useId();
  const visible = open || hovered;

  useEffect(() => {
    if (!open) return;
    function onDocPointer(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
    >
      <button
        type="button"
        aria-label="Plus d'informations"
        aria-expanded={open}
        aria-describedby={visible ? popId : undefined}
        onClick={() => {
          setOpen((o) => !o);
        }}
        style={{
          width: 16,
          height: 16,
          flexShrink: 0,
          borderRadius: "50%",
          border: `1px solid ${visible ? "var(--cosmetic-accent)" : "#6B6890"}`,
          background: "transparent",
          color: visible ? "var(--cosmetic-accent)" : "#6B6890",
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 10,
          lineHeight: 1,
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          padding: 0,
          boxShadow: visible
            ? "0 0 0 3px color-mix(in srgb, var(--cosmetic-accent) 12%, transparent)"
            : "none",
          transition: "all 200ms ease",
        }}
      >
        i
      </button>
      <span
        id={popId}
        role="tooltip"
        style={{
          position: "absolute",
          top: "calc(100% + 10px)",
          left: "50%",
          transform: `translateX(-50%) translateY(${visible ? "0" : "-4px"})`,
          width: 280,
          // Never exceed the viewport on small screens: cap at 280px but
          // shrink to fit when the screen is narrower than that plus margin.
          maxWidth: "min(280px, calc(100vw - 2rem))",
          background: "#110F33",
          border: "1px solid color-mix(in srgb, var(--cosmetic-accent) 35%, transparent)",
          boxShadow:
            "0 12px 40px rgba(0,0,0,0.5), 0 0 24px color-mix(in srgb, var(--cosmetic-accent) 10%, transparent)",
          padding: "14px 16px",
          zIndex: 50,
          opacity: visible ? 1 : 0,
          visibility: visible ? "visible" : "hidden",
          pointerEvents: visible ? "auto" : "none",
          transition: "opacity 200ms ease, transform 200ms ease",
          textTransform: "none",
          textAlign: "left",
        }}
      >
        {title ? (
          <span
            style={{
              display: "block",
              fontFamily: MONO,
              fontWeight: 600,
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--cosmetic-accent)",
              marginBottom: 8,
            }}
          >
            {title}
          </span>
        ) : null}
        <span
          style={{
            display: "block",
            fontFamily: SANS,
            fontSize: 12.5,
            lineHeight: 1.55,
            color: "#B8B5D1",
          }}
        >
          {children}
        </span>
      </span>
    </span>
  );
}
