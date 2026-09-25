/**
 * Server-side avatar storage helpers.
 *
 * Uploaded avatars live in a PRIVATE Supabase Storage bucket ("avatars").
 * Nothing is ever exposed by a public URL: uploads go through the service_role
 * client after server-side validation, and display sites resolve the stored
 * `__upload:<key>` marker to a short-lived signed URL. See docs/adr/ADR-003.
 *
 * This module is server-only (it uses the service_role key). Never import it
 * from a Client Component.
 */
import { randomUUID } from "node:crypto";
import {
  AVATAR_MIME_EXTENSION,
  AVATAR_UPLOAD_ALLOWED_MIME,
  AVATAR_UPLOAD_ERROR,
  AVATAR_UPLOAD_MAX_BYTES,
  UPLOADED_AVATAR_PREFIX,
  isUploadedAvatar,
  uploadedAvatarKey,
  type AvatarUploadMime,
} from "@cyberlearn/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const AVATAR_BUCKET = "avatars";
/** Signed-URL lifetime. 1h is the project's documented maximum for storage. */
export const AVATAR_SIGNED_TTL_SECONDS = 60 * 60;
// Re-sign once a cached URL has less than this left, so any URL we hand out is
// always valid for a comfortable margin.
const SIGNED_REFRESH_BUFFER_MS = 5 * 60 * 1000;

// Process-local cache of signed URLs, keyed by storage object key. Keeping a URL
// stable within its validity window means next/image sees a stable src and can
// cache it, instead of re-optimizing a fresh token on every render.
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

function getCachedSignedUrl(key: string): string | null {
  const hit = signedUrlCache.get(key);
  if (hit && hit.expiresAt - Date.now() > SIGNED_REFRESH_BUFFER_MS) return hit.url;
  return null;
}

function setCachedSignedUrl(key: string, url: string): void {
  signedUrlCache.set(key, { url, expiresAt: Date.now() + AVATAR_SIGNED_TTL_SECONDS * 1000 });
}

/**
 * Confirms the raw bytes actually match an allowed raster format, regardless of
 * the client-declared MIME type. Returns the trusted MIME or null on mismatch.
 */
function sniffImageMime(bytes: Uint8Array): AvatarUploadMime | null {
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // WEBP: "RIFF" .... "WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export interface AvatarUploadResult {
  marker?: string;
  error?: string;
}

/**
 * Validates and stores a user-supplied avatar image in the private bucket.
 *
 * Security: enforces an allowlist of raster MIME types (no SVG), a size cap,
 * and a magic-byte check so the declared content-type cannot be spoofed. The
 * object key is namespaced by user id with a random filename. On success the
 * previous uploaded avatar (if any) is best-effort removed to avoid orphans.
 *
 * Returns a `__upload:<key>` marker to store in User.avatarUrl, or an error.
 */
export async function uploadUserAvatar(
  userId: string,
  file: File,
  previousAvatarUrl: string | null,
): Promise<AvatarUploadResult> {
  if (file.size === 0) return { error: AVATAR_UPLOAD_ERROR.empty };
  if (file.size > AVATAR_UPLOAD_MAX_BYTES) {
    return { error: AVATAR_UPLOAD_ERROR.tooLarge };
  }
  if (!(AVATAR_UPLOAD_ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return { error: AVATAR_UPLOAD_ERROR.format };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImageMime(bytes);
  if (!sniffed || sniffed !== file.type) {
    return { error: AVATAR_UPLOAD_ERROR.content };
  }

  const key = `${userId}/${randomUUID()}.${AVATAR_MIME_EXTENSION[sniffed]}`;
  const admin = createSupabaseAdminClient();

  const { error } = await admin.storage.from(AVATAR_BUCKET).upload(key, bytes, {
    contentType: sniffed,
    upsert: false,
  });
  if (error) {
    return { error: AVATAR_UPLOAD_ERROR.storage };
  }

  // Best-effort cleanup of the previous uploaded avatar (ignore failures).
  const previousKey = uploadedAvatarKey(previousAvatarUrl);
  if (previousKey && previousKey !== key) {
    await admin.storage.from(AVATAR_BUCKET).remove([previousKey]);
  }

  return { marker: `${UPLOADED_AVATAR_PREFIX}${key}` };
}

/** Removes a user's uploaded avatar object, if the value is an upload marker. */
export async function deleteUploadedAvatar(avatarUrl: string | null): Promise<void> {
  const key = uploadedAvatarKey(avatarUrl);
  if (!key) return;
  const admin = createSupabaseAdminClient();
  await admin.storage.from(AVATAR_BUCKET).remove([key]);
}

/**
 * Resolves a stored avatar value to something a browser can render:
 *   - `__upload:<key>`  → a short-lived signed URL (or null if signing fails)
 *   - anything else     → returned unchanged (built-in path, `__glyph:` marker,
 *                         or null). Display components keep their existing
 *                         glyph/built-in handling for those.
 */
export async function resolveAvatarSrc(value: string | null): Promise<string | null> {
  if (!isUploadedAvatar(value)) return value;
  const key = uploadedAvatarKey(value);
  if (!key) return null;

  const cached = getCachedSignedUrl(key);
  if (cached) return cached;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(key, AVATAR_SIGNED_TTL_SECONDS);
  if (error) return null;
  setCachedSignedUrl(key, data.signedUrl);
  return data.signedUrl;
}

/**
 * Batch version of {@link resolveAvatarSrc} for lists (leaderboard, finishers).
 * Signs all uploaded markers in a single round-trip and preserves input order.
 */
export async function resolveAvatarSrcMany(values: (string | null)[]): Promise<(string | null)[]> {
  // Distinct keys that still need signing (cache misses only).
  const toSign = new Set<string>();
  for (const v of values) {
    const key = uploadedAvatarKey(v);
    if (key && !getCachedSignedUrl(key)) toSign.add(key);
  }

  if (toSign.size > 0) {
    const admin = createSupabaseAdminClient();
    const { data } = await admin.storage
      .from(AVATAR_BUCKET)
      .createSignedUrls([...toSign], AVATAR_SIGNED_TTL_SECONDS);
    for (const entry of data ?? []) {
      if (entry.signedUrl && entry.path) setCachedSignedUrl(entry.path, entry.signedUrl);
    }
  }

  return values.map((v) => {
    const key = uploadedAvatarKey(v);
    if (!key) return v;
    return getCachedSignedUrl(key);
  });
}
