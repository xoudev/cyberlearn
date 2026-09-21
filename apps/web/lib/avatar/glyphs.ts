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

const GLYPH_PATHS: Record<string, string> = {
  skull:
    "M12 4a6 6 0 0 0-6 6c0 2.1 1 4 2.6 5.2V17h6.8v-1.8A6 6 0 0 0 12 4zm-1.5 13v1.5a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5V17h-3zM9 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zm4 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0z",
  ghost:
    "M12 3a7 7 0 0 0-7 7v9l2-2 2 2 2-2 2 2 2-2 2 2v-9a7 7 0 0 0-7-7zm-2 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm4 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z",
  matrix:
    "M4 4h2v2H4zm4 0h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2zM4 8h2v2H4zm8 0h2v2h-2zM4 12h2v2H4zm4 0h2v2H8zm4 0h2v2h-2zM8 16h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2z",
  circuit:
    "M2 12h3M19 12h3M12 2v3M12 19v3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  bug: "M9 3h6l-1 3H10zm3 4a5 5 0 0 0-5 5v1a5 5 0 0 0 10 0v-1a5 5 0 0 0-5-5zM4 10H2m20 0h-2M4 7l2 2m12-2-2 2M4 17l2-2m12 2-2-2",
  key: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4",
  shield:
    "M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4zm0 4l5 2.5v4.5c0 3-2 5.8-5 6.75-3-.95-5-3.75-5-6.75V8.5L12 6z",
  wire: "M4 12h4l3-8 4 16 3-8h2",
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
