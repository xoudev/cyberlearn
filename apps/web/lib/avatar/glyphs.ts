/**
 * The built-in glyph avatars, and how to read the marker that names one.
 *
 * `User.avatarUrl` does not hold a URL. It holds one of four things - a
 * `__upload:<key>` marker, a `__glyph:<name>` marker, a built-in image path, or
 * null - and only the first two need anything done to them. That is a fine
 * design and a poor one to leave implicit: every display site had to remember
 * it, eleven of them did it by hand, and two forgot. The forum rendered the
 * marker straight into an `<img src>`, which is a broken image for anybody who
 * had uploaded a picture.
 *
 * So the knowledge lives here, once. This module is client-safe on purpose -
 * resolving an upload needs the service_role key and cannot cross into the
 * browser, but naming a glyph must, because the friends panel is a Client
 * Component.
 */

import { isUploadedAvatar } from "@cyberlearn/types";

/** The marker prefixes, spelled once. */
export const GLYPH_PREFIX = "__glyph:";

/**
 * Stroke paths on a 24 grid, drawn with square caps and mitred joins: the
 * angular line of the Bastion mark and the sidebar icons. Only the drawings
 * changed with the redesign - the names are stored in the database and stay.
 * The app keeps a copy (apps/mobile/components/media.tsx); change both.
 */
const GLYPH_PATHS: Record<string, string> = {
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
export function glyphNameOf(value: string | null): string | null {
  if (value?.startsWith(GLYPH_PREFIX) !== true) return null;
  return value.slice(GLYPH_PREFIX.length);
}

/** The path for a glyph, or null for a name nothing draws. */
export function glyphPath(name: string): string | null {
  return GLYPH_PATHS[name] ?? null;
}

/**
 * Whether a value can go into an `<img src>`.
 *
 * Neither marker can, and neither can null. An upload marker is on this list
 * even though a caller is supposed to have resolved it already: "supposed to"
 * is precisely what failed, and a caller who forgets gets a 404 and a broken
 * image rather than the initials that would at least say who this is. Caught
 * by rendering the preview, where a raw `__upload:` marker went on requesting
 * `/__upload:abc/def.png`.
 */
export function isRenderableSrc(value: string | null): value is string {
  if (value === null || value === "") return false;
  return glyphNameOf(value) === null && !isUploadedAvatar(value);
}

/**
 * Two letters for somebody with no picture. Never empty: a list of blank
 * circles says less than a list of initials.
 */
export function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/[\s._-]+/u)
    .filter(Boolean);
  if (parts.length >= 2) return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  const first = parts[0] ?? "?";
  return first.slice(0, 2).toUpperCase();
}
