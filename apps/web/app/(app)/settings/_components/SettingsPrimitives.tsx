import type React from "react";
import { MONO, S, SANS } from "./tokens";

/** Design card corners - 1.5px L-shapes inset 7px (settings.css `.card__corners`). */
function CardCorners({ color }: { color: string }): React.JSX.Element {
  const c: React.CSSProperties = {
    position: "absolute",
    width: 12,
    height: 12,
    border: `1.5px solid ${color}`,
  };
  return (
    <span aria-hidden="true" style={{ position: "absolute", inset: 7, pointerEvents: "none" }}>
      <span style={{ ...c, top: 0, left: 0, borderRight: 0, borderBottom: 0 }} />
      <span style={{ ...c, top: 0, right: 0, borderLeft: 0, borderBottom: 0 }} />
      <span style={{ ...c, bottom: 0, left: 0, borderRight: 0, borderTop: 0 }} />
      <span style={{ ...c, bottom: 0, right: 0, borderLeft: 0, borderTop: 0 }} />
    </span>
  );
}

/** `// LABEL   hint` section header. */
export function SectionHead({ label, hint }: { label: string; hint?: string }): React.JSX.Element {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 4 }}>
      <span
        style={{
          fontFamily: MONO,
          fontWeight: 600,
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: S.turq,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span aria-hidden="true" style={{ color: S.disabled }}>
          {"//"}
        </span>
        {label}
      </span>
      {hint ? (
        <span style={{ fontFamily: MONO, fontSize: 10, color: S.muted, letterSpacing: "0.08em" }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

interface SettingsCardProps {
  title?: string;
  desc?: string;
  /** Rendered next to the title (typically an InfoTip). */
  info?: React.ReactNode;
  variant?: "key" | "danger";
  children: React.ReactNode;
}

/** Elevated panel with bracket corners (settings.css `.card`). */
export function SettingsCard({
  title,
  desc,
  info,
  variant,
  children,
}: SettingsCardProps): React.JSX.Element {
  const cornerColor = variant === "danger" ? S.danger : S.turq;
  const background =
    variant === "key"
      ? `linear-gradient(180deg, rgba(10,255,212,0.05), transparent 30%), ${S.elev}`
      : variant === "danger"
        ? `linear-gradient(180deg, rgba(255,77,109,0.05), transparent 30%), ${S.elev}`
        : S.elev;
  const borderColor =
    variant === "key"
      ? "rgba(10,255,212,0.28)"
      : variant === "danger"
        ? "rgba(255,77,109,0.4)"
        : S.border;

  return (
    <section
      style={{
        position: "relative",
        background,
        border: `1px solid ${borderColor}`,
        padding: "28px 30px",
      }}
    >
      <CardCorners color={cornerColor} />
      {title ? (
        <h3
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: 20,
            letterSpacing: "-0.01em",
            color: S.fg,
            margin: "0 0 6px",
          }}
        >
          {title}
          {info}
        </h3>
      ) : null}
      {desc ? (
        <p
          style={{
            fontFamily: SANS,
            fontSize: 14,
            lineHeight: 1.55,
            color: S.fg2,
            margin: "0 0 22px",
            maxWidth: 560,
          }}
        >
          {desc}
        </p>
      ) : null}
      {children}
    </section>
  );
}
