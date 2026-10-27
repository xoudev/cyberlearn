import { AVATAR_PATHS, isUploadedAvatar, uploadedAvatarKey } from "@cyberlearn/types";

/**
 * What a stored avatar value is, and how to draw the parts of it that need no
 * secret. Client-safe on purpose: signing an upload needs the service_role key
 * and stays on a server, but naming a glyph, telling a built-in picture from a
 * remote one and writing the initials are the same decision in every app.
 *
 * `User.avatarUrl` does not hold a URL. It holds one of five things:
 *   - `__upload:<key>`  a photo in the private "avatars" bucket, to be signed;
 *   - `__glyph:<name>`  a vector glyph, drawn from the paths below;
 *   - `/avatars/av-N.svg` one of the site's eight built-in pictures, served by
 *     the learner site (a relative path: another app prefixes the site origin);
 *   - an https URL       the picture of a linked identity (GitHub);
 *   - null               nobody chose one: the initials.
 *
 * The site (apps/web/lib/avatar/glyphs.ts) and the app
 * (apps/mobile/components/media.tsx) still carry their own copy of the glyph
 * paths; this module is the one the console reads.
 */

/** The prefix of a glyph marker. */
export const GLYPH_PREFIX = "__glyph:";

/**
 * Stroke paths on a 24 grid, drawn with square caps and mitred joins: the
 * angular line of the Bastion mark. The names are stored in the database.
 */
const GLYPH_PATHS: Readonly<Record<string, string>> = {
  skull: "M7 3H17L20 6V13L17 16V20H7V16L4 13V6ZM8 9H11V12H8ZM13 9H16V12H13ZM10 16V20M14 16V20",
  ghost: "M5 21V8L10 3H14L19 8V21L15.5 17.5L12 21L8.5 17.5ZM9 9H11V12H9ZM13 9H15V12H13Z",
  matrix:
    "M4.5 3V7M4.5 10V12M4.5 15V21M9.5 3V5M9.5 8V14M9.5 17V19M14.5 3V9M14.5 12V14M14.5 17V21M19.5 5V11M19.5 14V18",
  circuit: "M8 8H16V16H8ZM10 3V8M14 3V8M10 16V21M14 16V21M3 10H8M3 14H8M16 10H21M16 14H21",
  bug: "M9 8H15L17 10V16L14 19H10L7 16V10ZM10 8V5H14V8M3 12H7M17 12H21M4 7L7 10M20 7L17 10M4 19L7 16M20 19L17 16",
  key: "M2.5 7.5H11.5V16.5H2.5ZM11.5 12H21.5M16.5 12V16M20 12V15.5",
  shield: "M4 3H20V12L12 20L4 12ZM8 7H16V10.5L12 14.5L8 10.5Z",
  wire: "M2 12H6L8.14 4L12.43 20L14.57 12H22",
};

/** The glyph a stored value names, or null if it names none. */
export function glyphNameOf(value: string | null | undefined): string | null {
  if (value?.startsWith(GLYPH_PREFIX) !== true) return null;
  return value.slice(GLYPH_PREFIX.length);
}

/** The path for a glyph, or null for a name nothing draws any more. */
export function glyphPath(name: string): string | null {
  return GLYPH_PATHS[name] ?? null;
}

/** What a stored avatar value is. */
export type AvatarSource =
  | { kind: "upload"; key: string }
  | { kind: "glyph"; name: string }
  | { kind: "builtin"; path: string }
  | { kind: "remote"; url: string }
  | { kind: "none" };

/**
 * Reads a stored value. Anything that is none of the known forms - a relative
 * path the site does not serve, a `javascript:` string, an http URL - is
 * "none": the initials are always a safe thing to draw, an unknown src is not.
 */
export function avatarSourceOf(value: string | null | undefined): AvatarSource {
  if (value === null || value === undefined || value === "") return { kind: "none" };
  // Read through the key rather than the isUploadedAvatar guard: the guard
  // says "value is string", which narrows every other string to never.
  const key = uploadedAvatarKey(value);
  if (key !== null) return key === "" ? { kind: "none" } : { kind: "upload", key };
  const glyph = glyphNameOf(value);
  if (glyph !== null) return { kind: "glyph", name: glyph };
  if ((AVATAR_PATHS as readonly string[]).includes(value)) return { kind: "builtin", path: value };
  if (value.startsWith("https://")) {
    try {
      return { kind: "remote", url: new URL(value).toString() };
    } catch {
      return { kind: "none" };
    }
  }
  return { kind: "none" };
}

/**
 * Whether a resolved value can go into an `<img src>`: neither marker can, nor
 * nothing. An upload marker is refused even though the caller should have
 * signed it, so a caller who forgot gets the initials rather than a request
 * for `/__upload:abc/def.png`.
 */
export function isRenderableAvatarSrc(value: string | null | undefined): value is string {
  if (value === null || value === undefined || value === "") return false;
  return glyphNameOf(value) === null && !isUploadedAvatar(value);
}

/**
 * Two letters for somebody with no picture, taken from two words when there
 * are two ("Amélie Durand" → "AD", "jean-marc" → "JM"). Never empty: a list of
 * blank squares says less than a list of initials.
 */
export function avatarInitials(name: string): string {
  const parts = name
    .trim()
    .replace(/^@/u, "")
    .split(/[\s._-]+/u)
    .filter(Boolean);
  // By code point, so a name that starts with an emoji keeps it whole.
  const letters = (word: string | undefined): string[] => Array.from(word ?? "");
  if (parts.length >= 2) {
    return ((letters(parts[0])[0] ?? "") + (letters(parts[1])[0] ?? "")).toUpperCase();
  }
  const first = letters(parts[0]).slice(0, 2).join("");
  return first === "" ? "?" : first.toUpperCase();
}
