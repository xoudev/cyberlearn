/**
 * A path's covers, as the site shows them: an image sent from the console
 * first, else the path's own illustration, or its category's. Both come from
 * /api/mobile/path-covers (the site's lib/paths/cover), because the uploaded
 * image sits in a private bucket the app has no key to.
 */
export interface PathCover {
  slug: string;
  /** The image sent from the console, signed for an hour; null without one. */
  image: string | null;
  /** The illustration shipped with the site, a site path ("/covers/paths/linux.svg"). */
  illustration: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readCover(value: unknown): PathCover | null {
  if (!isRecord(value)) return null;
  const { slug, image, illustration } = value;
  if (typeof slug !== "string" || slug === "") return null;
  // Only a site path: the app loads it from the site it talks to.
  if (typeof illustration !== "string" || !illustration.startsWith("/covers/")) return null;
  // Only an https address for the image, as the site signs it.
  const signed = typeof image === "string" && image.startsWith("https://") ? image : null;
  return { slug, image: signed, illustration };
}

/** The covers by slug, from the endpoint's answer. A malformed entry is left out. */
export function readPathCovers(body: unknown): Map<string, PathCover> {
  if (!isRecord(body) || body.ok !== true || !Array.isArray(body.covers)) {
    const error = isRecord(body) && typeof body.error === "string" ? body.error : null;
    throw new Error(error ?? "Chargement impossible");
  }
  const covers = new Map<string, PathCover>();
  for (const entry of body.covers) {
    const cover = readCover(entry);
    if (cover) covers.set(cover.slug, cover);
  }
  return covers;
}

/** The illustration's full address, on the site at `origin`. */
export function illustrationUri(cover: PathCover, origin: string): string {
  return `${origin.replace(/\/+$/u, "")}${cover.illustration}`;
}
