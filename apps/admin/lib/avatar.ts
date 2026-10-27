/**
 * Server-only: signs the uploaded photos the console shows. It uses the
 * service_role key; never import it from a Client Component. A page resolves
 * the avatars of its rows here and hands the resulting strings down.
 *
 * Uploaded avatars live in the PRIVATE "avatars" bucket (docs/adr/ADR-003).
 * A photo is shown through a signed URL with a short life: ten minutes, under
 * the one-hour ceiling of the storage convention. A process-local cache keeps
 * the same URL for a key while it has a few minutes left, so a list paged
 * back and forth does not sign the same photo on every visit, and the browser
 * can keep the image it already has.
 */
import { createSupabaseAdminClient } from "@cyberlearn/db";
import { avatarSourceOf } from "@cyberlearn/lib/avatar/display";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { env } from "@/lib/env";
import { avatarDisplaySrc, originOf } from "./avatar-src";

const AVATAR_BUCKET = "avatars";
const SIGNED_TTL_SECONDS = 10 * 60;
/** A cached URL with less than this left is signed again. */
const REFRESH_BUFFER_MS = 3 * 60 * 1000;
/** Beyond this many keys the expired ones are dropped, then all if need be. */
const CACHE_LIMIT = 2_000;

const signedCache = new Map<string, { url: string; expiresAt: number }>();

function cachedUrl(key: string, now: number): string | null {
  const hit = signedCache.get(key);
  return hit !== undefined && hit.expiresAt - now > REFRESH_BUFFER_MS ? hit.url : null;
}

function remember(key: string, url: string, now: number): void {
  if (signedCache.size >= CACHE_LIMIT) {
    for (const [cachedKey, entry] of signedCache) {
      if (entry.expiresAt <= now) signedCache.delete(cachedKey);
    }
    if (signedCache.size >= CACHE_LIMIT) signedCache.clear();
  }
  signedCache.set(key, { url, expiresAt: now + SIGNED_TTL_SECONDS * 1000 });
}

/** Signs, in one round trip, the keys the cache cannot answer. */
async function signMissing(keys: readonly string[], now: number): Promise<void> {
  const missing = [...new Set(keys)].filter((key) => cachedUrl(key, now) === null);
  if (missing.length === 0) return;
  try {
    const { data, error } = await createSupabaseAdminClient()
      .storage.from(AVATAR_BUCKET)
      .createSignedUrls(missing, SIGNED_TTL_SECONDS);
    if (error !== null) {
      logger.warn({ scope: "admin", err: errorMessage(error) }, "avatar signing failed");
      return;
    }
    for (const entry of data) {
      if (entry.path !== null && entry.signedUrl !== "" && entry.error === null) {
        remember(entry.path, entry.signedUrl, now);
      }
    }
  } catch (error: unknown) {
    // A picture that cannot be signed is shown as its initials; the page
    // itself must not fail for it.
    logger.warn({ scope: "admin", err: errorMessage(error) }, "avatar signing failed");
  }
}

/**
 * The src of each stored avatar, in order: a signed URL, an absolute URL on
 * the learner site, a glyph marker, or null for the initials.
 */
export async function resolveAvatarSrcs(
  values: readonly (string | null | undefined)[],
): Promise<(string | null)[]> {
  const now = Date.now();
  const keys: string[] = [];
  for (const value of values) {
    const source = avatarSourceOf(value);
    if (source.kind === "upload") keys.push(source.key);
  }
  await signMissing(keys, now);

  const siteOrigin = originOf(env.NEXT_PUBLIC_SITE_URL) ?? "https://cyberlearn.fr";
  return values.map((value) =>
    avatarDisplaySrc(value, { siteOrigin, signedUrlOf: (key) => cachedUrl(key, now) }),
  );
}

/** {@link resolveAvatarSrcs} for one avatar. */
export async function resolveAvatarSrc(value: string | null | undefined): Promise<string | null> {
  const [src] = await resolveAvatarSrcs([value]);
  return src ?? null;
}

/**
 * Resolves the avatars of a list of rows and returns a lookup by the row's
 * key, for a page that renders its rows in another order or in parts.
 */
export async function avatarSrcMap<T>(
  rows: readonly T[],
  keyOf: (row: T) => string,
  avatarOf: (row: T) => string | null | undefined,
): Promise<Map<string, string | null>> {
  const srcs = await resolveAvatarSrcs(rows.map(avatarOf));
  return new Map(rows.map((row, index) => [keyOf(row), srcs[index] ?? null]));
}
