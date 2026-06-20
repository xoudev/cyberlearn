import React from "react";

// Presentational primitives shared by the Classement (global leaderboard) and
// Ligue (season pod) views so both render with the same visual language.

export const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
export const DISPLAY: React.CSSProperties = { fontFamily: "var(--font-sans)" };

/** Two-letter monogram from a name; "AN" (Anonyme) when nothing is available. */
export function getMonogram(displayName: string | null, username: string | null): string {
  const name = displayName ?? username ?? "Anonyme";
  const parts = name.split(/[\s._-]/);
  if (parts.length >= 2) return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function fmtXp(xp: number): string {
  return xp.toLocaleString("fr-FR");
}

/** Hexagonal avatar with a gradient border + monogram. */
export function HexAvatar({
  mono,
  grad,
  size = 36,
}: { mono: string; grad: string; size?: number }): React.JSX.Element {
  const s = size;
  return (
    <div
      style={{
        position: "relative",
        width: s,
        height: Math.round(s * 1.15),
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      {/* outer hex */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: grad,
          clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
        }}
      />
      {/* inner fill */}
      <div
        style={{
          position: "absolute",
          inset: 2,
          background: "#0A0826",
          clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
        }}
      />
      {/* content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: `calc(100% - ${String(Math.round(s * 0.14))}px)`,
          height: `calc(100% - ${String(Math.round(s * 0.14))}px)`,
          display: "grid",
          placeItems: "center",
          clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
          background: "linear-gradient(160deg, #1a1640, #070520aa)",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            ...DISPLAY,
            fontWeight: 800,
            fontSize: Math.round(s * 0.38),
            letterSpacing: "-0.04em",
            background: grad,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            position: "relative",
            zIndex: 1,
          }}
        >
          {mono}
        </span>
      </div>
    </div>
  );
}
