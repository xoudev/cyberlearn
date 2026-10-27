import React from "react";
import { formatNumberFr } from "@cyberlearn/lib";
import { AvatarView } from "@/components/avatar-view";

// Presentational primitives shared by the global leaderboard and the league
// (season pod) views so both render with the same visual language.

export const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
export const DISPLAY: React.CSSProperties = { fontFamily: "var(--font-display), sans-serif" };
export const INTERFACE: React.CSSProperties = { fontFamily: "var(--font-interface), sans-serif" };

export function fmtXp(xp: number): string {
  // Rendered by client components: see formatNumberFr for why not toLocaleString.
  return formatNumberFr(xp);
}

/**
 * A player's avatar: a square on carbon with a flat contour. The player's own
 * picture when the server sent one (resolved, and only on a row that shows
 * who it is), their monogram otherwise.
 *
 * Not the site's `.cl-avatar-frame`: that frame wears the reader's equipped
 * contour, and another player's avatar is not the reader's to dress.
 */
export function PlayerAvatar({
  mono,
  ring,
  size = 36,
  src = null,
  name = mono,
}: {
  mono: string;
  /** The contour's colour: a medal, the accent, or a neutral line. */
  ring: string;
  size?: number;
  /** Resolved on the server (lib/leaderboard/boards.ts); null draws the monogram. */
  src?: string | null;
  /** Whose picture it is, for its alt text. */
  name?: string;
}): React.JSX.Element {
  const border = size >= 40 ? 2 : 1;
  const face: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
    objectFit: "cover",
    ...DISPLAY,
    fontWeight: 700,
    fontSize: Math.round(size * 0.4),
    lineHeight: 1,
    color: "#f4f2ed",
  };
  return (
    <span
      style={{
        boxSizing: "border-box",
        width: size,
        height: size,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        overflow: "hidden",
        border: `${String(border)}px solid ${ring}`,
        background: "#191c22",
      }}
    >
      {src !== null ? (
        <AvatarView src={src} name={name} glyphSize={Math.round(size * 0.5)} style={face} />
      ) : (
        <span style={face}>{mono}</span>
      )}
    </span>
  );
}
