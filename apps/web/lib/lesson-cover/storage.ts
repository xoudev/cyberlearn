/**
 * Server-side lesson-cover resolver (web).
 *
 * Uploaded covers live in a PRIVATE Supabase Storage bucket ("lesson-covers").
 * The catalog resolves the stored `__cover:<key>` marker to a short-lived signed
 * URL via the service_role client. Non-marker values (external URLs, null) pass
 * through unchanged.
 *
 * This module is server-only (it uses the service_role key). Never import it
 * from a Client Component.
 */
import { isUploadedCover, uploadedCoverKey } from "@cyberlearn/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const LESSON_COVER_BUCKET = "lesson-covers";
/** Signed-URL lifetime. 1h is the project's documented maximum for storage. */
export const LESSON_COVER_SIGNED_TTL_SECONDS = 60 * 60;
// Re-sign once a cached URL has less than this left, so any URL we hand out is
// always valid for a comfortable margin.
const SIGNED_REFRESH_BUFFER_MS = 5 * 60 * 1000;

// Process-local cache of signed URLs, keyed by storage object key. A stable URL
// within its validity window keeps the catalog's <img> src stable across renders.
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

function getCachedSignedUrl(key: string): string | null {
  const hit = signedUrlCache.get(key);
  if (hit && hit.expiresAt - Date.now() > SIGNED_REFRESH_BUFFER_MS) return hit.url;
  return null;
}

function setCachedSignedUrl(key: string, url: string): void {
  signedUrlCache.set(key, { url, expiresAt: Date.now() + LESSON_COVER_SIGNED_TTL_SECONDS * 1000 });
}

/**
 * Resolves a stored cover value to a renderable src:
 *   - `__cover:<key>` → a short-lived signed URL (or null if signing fails)
 *   - anything else   → returned unchanged (external URL or null).
 */
export async function resolveLessonCoverSrc(value: string | null): Promise<string | null> {
  if (!isUploadedCover(value)) return value;
  const key = uploadedCoverKey(value);
  if (!key) return null;

  const cached = getCachedSignedUrl(key);
  if (cached) return cached;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(LESSON_COVER_BUCKET)
    .createSignedUrl(key, LESSON_COVER_SIGNED_TTL_SECONDS);
  if (error) return null;
  setCachedSignedUrl(key, data.signedUrl);
  return data.signedUrl;
}

/**
 * Batch version of {@link resolveLessonCoverSrc} for the catalog grid. Signs all
 * uploaded markers in a single round-trip and preserves input order.
 */
export async function resolveLessonCoverSrcMany(
  values: (string | null)[],
): Promise<(string | null)[]> {
  const toSign = new Set<string>();
  for (const v of values) {
    const key = uploadedCoverKey(v);
    if (key && !getCachedSignedUrl(key)) toSign.add(key);
  }

  if (toSign.size > 0) {
    const admin = createSupabaseAdminClient();
    const { data } = await admin.storage
      .from(LESSON_COVER_BUCKET)
      .createSignedUrls([...toSign], LESSON_COVER_SIGNED_TTL_SECONDS);
    for (const entry of data ?? []) {
      if (entry.signedUrl && entry.path) setCachedSignedUrl(entry.path, entry.signedUrl);
    }
  }

  return values.map((v) => {
    if (!isUploadedCover(v)) return v;
    const key = uploadedCoverKey(v);
    if (!key) return null;
    return getCachedSignedUrl(key);
  });
}
