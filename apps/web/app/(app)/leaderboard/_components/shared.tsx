import React from "react";
import { formatNumberFr } from "@cyberlearn/lib";
import { AvatarView } from "@/components/avatar-view";

// Presentational primitives shared by the global leaderboard and the league
// (season pod) views so both render with the same visual language.

export const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
export const DISPLAY: React.CSSProperties = { fontFamily: "var(--font-display), sans-serif" };

export function fmtXp(xp: number): string {
  // Rendered by client components: see formatNumberFr for why not toLocaleString.
  return formatNumberFr(xp);
}

/**
 * Hexagonal avatar with a gradient border: the player's own picture when the
 * server sent one (resolved, and only on a row that shows who it is), their
 * monogram otherwise.
 */
export function HexAvatar({
  mono,
  grad,
  size = 36,
  src = null,
  name = mono,
}: {
  mono: string;
  grad: string;
  size?: number;
  /** Resolved on the server (lib/leaderboard/boards.ts); null draws the monogram. */
  src?: string | null;
  /** Whose picture it is, for its alt text. */
  name?: string;
}): React.JSX.Element {
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
          background: "var(--color-bg-elevated)",
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
        {src !== null ? (
          <AvatarView
            src={src}
            name={name}
            glyphSize={Math.round(s * 0.5)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "grid",
              placeItems: "center",
              ...DISPLAY,
              fontWeight: 800,
              fontSize: Math.round(s * 0.38),
              color: "var(--color-text-secondary)",
            }}
          />
        ) : (
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
        )}
      </div>
    </div>
  );
}
