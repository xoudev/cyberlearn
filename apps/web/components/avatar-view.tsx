import React from "react";
import { glyphNameOf, glyphPath, initialsOf, isRenderableSrc } from "@/lib/avatar/glyphs";

/**
 * Somebody's avatar, drawn from a value that has already been resolved.
 *
 * Presentational and client-safe: it takes what to draw, not where to get it.
 * That split is what lets the same component serve the forum, which renders on
 * the server, and the friends panel, which is a Client Component reading a
 * server action.
 *
 * Every surface keeps its own shape and size through `className` - a 46px
 * circle in the forum, a 28px hexagon in the friends panel - because the CSS
 * is where a surface's look belongs. What is shared is the decision of *what*
 * to draw, which is the part that was being got wrong.
 */

export interface AvatarViewProps {
  /** Already resolved: a signed URL, a built-in path, a glyph marker, or null. */
  src: string | null;
  /** Whose it is, for the initials and the alt text. */
  name: string;
  /** The surface's own class, which carries the size and the shape. */
  className?: string;
  /** Drawing size for a glyph, in px. Matches the class's box. */
  glyphSize?: number;
}

export function AvatarView({
  src,
  name,
  className,
  glyphSize = 20,
}: AvatarViewProps): React.JSX.Element {
  const glyph = glyphNameOf(src);
  if (glyph !== null) {
    const d = glyphPath(glyph);
    return (
      <span className={className}>
        <svg
          width={glyphSize}
          height={glyphSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--cosmetic-accent)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {d !== null ? <path d={d} /> : <circle cx="12" cy="12" r="8" />}
        </svg>
      </span>
    );
  }

  if (isRenderableSrc(src)) {
    // A plain <img>, not next/image: a signed URL carries a token and expires,
    // so the optimizer would cache a copy that outlives it and serve a 400.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={className} src={src} alt={`Avatar de ${name}`} />;
  }

  return (
    <span className={className} aria-hidden="true">
      {initialsOf(name)}
    </span>
  );
}
