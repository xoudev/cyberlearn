"use client";

import type React from "react";
import { EASE, MONO, S, SANS } from "./tokens";

/** Terminal-style on/off switch (settings.css `.switch`). */
export function Switch({
  on,
  onClick,
  disabled = false,
  label,
}: {
  on: boolean;
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 44,
        height: 24,
        flexShrink: 0,
        background: on ? "rgba(10,255,212,0.12)" : S.base,
        border: `1px solid ${on ? S.turq : S.border}`,
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        padding: 0,
        opacity: disabled ? 0.45 : 1,
        boxShadow: on ? "0 0 14px rgba(10,255,212,0.2)" : "none",
        transition: `all 200ms ${EASE}`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 2,
          left: on ? 22 : 2,
          width: 18,
          height: 18,
          background: on ? S.turq : S.muted,
          boxShadow: on ? "0 0 10px #0AFFD4" : "none",
          transition: `all 200ms ${EASE}`,
        }}
      />
    </button>
  );
}

/** Segmented exclusive control for short option sets (settings.css `.seg`). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
}: {
  value: T;
  options: readonly { id: T; label: string }[];
  onChange?: (id: T) => void;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <div
      role="radiogroup"
      style={{
        display: "inline-flex",
        border: `1px solid ${S.border}`,
        background: S.base,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {options.map((o, i) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange?.(o.id)}
            style={{
              fontFamily: MONO,
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: active ? S.base : S.fg2,
              background: active ? S.turq : "transparent",
              padding: "9px 16px",
              border: 0,
              borderRight: i < options.length - 1 ? `1px solid ${S.border}` : 0,
              cursor: disabled ? "not-allowed" : "pointer",
              transition: "all 200ms ease",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** A label + description row with a right-aligned control (settings.css `.toggle-row`). */
export function ToggleRow({
  name,
  desc,
  info,
  children,
  last = false,
}: {
  name: string;
  desc: string;
  info?: React.ReactNode;
  children: React.ReactNode;
  last?: boolean;
}): React.JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        // Wrap on narrow viewports so the control drops below the label/description
        // instead of overlapping it. Stays side-by-side once the row has room.
        flexWrap: "wrap",
        gap: 20,
        padding: "16px 0",
        borderBottom: last ? "none" : `1px solid ${S.borderSoft}`,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: 14,
            color: S.fg,
            marginBottom: 3,
          }}
        >
          {name}
          {info}
        </div>
        <div style={{ fontFamily: SANS, fontSize: 12.5, color: S.muted, lineHeight: 1.45 }}>
          {desc}
        </div>
      </div>
      {children}
    </div>
  );
}

/**
 * Contextual sticky save bar. Belongs inside a <form>: "Enregistrer" is a submit
 * button, "Annuler" calls onCancel. Both are disabled when there is nothing to
 * save or while a save is in flight.
 */
export function SaveBar({
  dirty,
  pending,
  onCancel,
}: {
  dirty: boolean;
  pending: boolean;
  onCancel: () => void;
}): React.JSX.Element {
  const idle = !dirty || pending;
  return (
    <div
      style={{
        position: "sticky",
        bottom: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        // Wrap on narrow viewports (the button row drops to its own line) so the
        // primary submit button is never clipped off the card edge. gap doubles
        // as the row-gap once wrapped.
        flexWrap: "wrap",
        gap: 16,
        marginTop: 8,
        padding: "14px 20px",
        background: "rgba(10,8,38,0.92)",
        border: `1px solid ${S.border}`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: "0.08em",
          color: dirty ? S.warning : S.muted,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          aria-hidden="true"
          style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }}
        />
        {dirty ? "Modifications en attente" : "Synchronisé"}
      </span>
      <div
        style={{
          display: "flex",
          // When the parent wraps, this group takes the whole line and keeps the
          // buttons right-aligned (matches the desktop layout); on desktop the
          // grow is absorbed and the appearance is unchanged.
          flex: "1 1 auto",
          justifyContent: "flex-end",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={idle}
          style={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            padding: "0 18px",
            height: 40,
            background: "transparent",
            border: `1px solid ${S.border}`,
            color: idle ? S.disabled : S.fg2,
            cursor: idle ? "not-allowed" : "pointer",
            transition: `all 200ms ${EASE}`,
          }}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={idle}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            padding: "0 22px",
            height: 40,
            background: idle ? "transparent" : S.blue,
            border: `1px solid ${idle ? S.border : S.blue}`,
            color: idle ? S.disabled : "#fff",
            cursor: idle ? "not-allowed" : "pointer",
            boxShadow: idle
              ? "none"
              : "0 0 24px rgba(0,36,255,0.35), inset 0 0 0 1px rgba(255,255,255,0.1)",
            transition: `all 200ms ${EASE}`,
          }}
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
