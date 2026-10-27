import { avatarSourceOf, GLYPH_PREFIX } from "@cyberlearn/lib/avatar/display";

/**
 * What the console puts in an avatar's `src`, from what the database stores.
 * Pure, so it is tested; the signing itself is lib/avatar.ts, server-only.
 *
 * The console showed nobody's picture: it drew initials everywhere, because
 * every stored form needs something done to it before a browser can draw it
 * from admin.cyberlearn.fr. A photo is a marker for a private bucket, to be
 * signed; a built-in picture is a path on the learner site, which the console
 * does not serve; a glyph is a name, drawn as a vector.
 */
export interface AvatarSrcContext {
  /** The learner site's origin, which serves the eight built-in pictures. */
  siteOrigin: string;
  /** The signed URL of an uploaded photo, or null when it could not be signed. */
  signedUrlOf: (key: string) => string | null;
}

/**
 * A src the console can render: an absolute URL, a `__glyph:` marker the
 * avatar component draws as a vector, or null for the initials.
 */
export function avatarDisplaySrc(
  value: string | null | undefined,
  context: AvatarSrcContext,
): string | null {
  const source = avatarSourceOf(value);
  switch (source.kind) {
    case "upload":
      return context.signedUrlOf(source.key);
    case "glyph":
      return `${GLYPH_PREFIX}${source.name}`;
    case "builtin":
      return new URL(source.path, context.siteOrigin).toString();
    case "remote":
      return source.url;
    case "none":
      return null;
  }
}

/** The origin of a configured URL, or null when it is not one. */
export function originOf(url: string | undefined): string | null {
  if (url === undefined || url === "") return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
