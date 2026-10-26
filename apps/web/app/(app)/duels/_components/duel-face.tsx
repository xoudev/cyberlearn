import Link from "next/link";
import React from "react";
import { AvatarView } from "@/components/avatar-view";
import type { DuelPlayer } from "@/lib/social/duels";

/**
 * A player of a duel as the cards and the duel page draw them: their picture
 * in the square box the monogram used to fill (signed on the server,
 * `avatarSrc`), and their name, a link to their profile when it would open
 * for the reader (`profileHref`). Client-safe: the duel page, which reads the
 * duel again as it goes, draws them too.
 */

const GLYPH_SIZE: Record<"sm" | "lg", number> = { sm: 18, lg: 26 };

export function DuelAvatar({
  player,
  size,
  me = false,
}: {
  player: DuelPlayer;
  size: "sm" | "lg";
  /** The reader's own side, drawn in the accent. */
  me?: boolean;
}): React.JSX.Element {
  // The box keeps the size, the border and the reader's accent; the picture,
  // the glyph or the initials fill it. The name is written beside it, so the
  // picture says nothing a screen reader needs.
  return (
    <span
      className={`dl-mono dl-mono--${size}`}
      {...(me ? { "data-me": "true" } : {})}
      aria-hidden="true"
    >
      <AvatarView
        src={player.avatarSrc}
        name={player.name}
        className="dl-mono__face"
        glyphSize={GLYPH_SIZE[size]}
      />
    </span>
  );
}

/** Their name: a link to their profile when it opens for the reader, the name alone otherwise. */
export function DuelName({
  player,
  className,
  title,
}: {
  player: DuelPlayer;
  className?: string;
  title?: string;
}): React.JSX.Element {
  if (player.profileHref === null) {
    return (
      <span className={className} title={title}>
        {player.name}
      </span>
    );
  }
  return (
    <Link
      href={player.profileHref}
      prefetch={false}
      className={className === undefined ? "dl-name-link" : `${className} dl-name-link`}
      title={title}
    >
      {player.name}
    </Link>
  );
}
