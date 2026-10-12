import React from "react";

/**
 * The friends mark, drawn once.
 *
 * Two heads, the second one smaller and behind: the navbar's friends button,
 * the friend notifications and the mark beside a friend's name were each
 * drawing it on their own, path for path. A fourth copy, in a fourth size,
 * was the moment to keep one.
 *
 * `filled` fills the second head: an accepted friendship in the notifications
 * and beside a name, an outline for a request still waiting.
 */
export function FriendsGlyph({
  size = 17,
  color = "currentColor",
  strokeWidth = 1.5,
  filled = false,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
  filled?: boolean;
}): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="7.5" cy="6.5" r="3" />
      <path d="M2 16.5c0-3 2.5-4.6 5.5-4.6s5.5 1.6 5.5 4.6" />
      <circle cx="14.5" cy="7.5" r="2.4" fill={filled ? color : "none"} />
      <path d="M13 12.2c3 0 5 1.5 5 4.3" />
    </svg>
  );
}

/**
 * "Ami", beside a name: the person on this row is one of the reader's friends.
 *
 * Where a screen lists people, the reader's own friends are the names they
 * look for first. The mark is small and in the accent, read as a word by a
 * screen reader rather than skipped as an image.
 *
 * Only where the row already shows who it is. The flag comes from the server
 * already decided (leaderboard.visibility.ts, the tournament scoreboard, the
 * class roster): on an anonymous row a mark would tell the reader which of
 * their friends that row is, the one thing the row was hiding.
 *
 * No hooks and no state: it renders in a Server Component as well as in a
 * Client one.
 */
export function FriendMark({
  size = 13,
  className,
}: {
  size?: number;
  className?: string;
}): React.JSX.Element {
  return (
    <span
      role="img"
      aria-label="Ami"
      title="Ami"
      className={className === undefined ? "friend-mark" : `friend-mark ${className}`}
    >
      <FriendsGlyph size={size} color="var(--cosmetic-accent)" strokeWidth={1.6} filled />
    </span>
  );
}
