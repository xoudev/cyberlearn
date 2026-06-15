/**
 * Server-side lesson-cover storage helpers (admin).
 *
 * Uploaded covers live in a PRIVATE Supabase Storage bucket ("lesson-covers").
 * Nothing is ever exposed by a public URL: uploads go through the service_role
 * client after server-side validation, and the stored `__cover:<key>` marker is
 * resolved to a short-lived signed URL for display. Buckets are private by
 * default per the project storage convention.
 *
 * This module is server-only (it uses the service_role key). Never import it
 * from a Client Component - client code imports the server action instead.
 */
import { randomUUID } from "node:crypto";
import {
  COVER_MIME_EXTENSION,
  COVER_UPLOAD_ALLOWED_MIME,
  COVER_UPLOAD_MAX_BYTES,
  UPLOADED_COVER_PREFIX,
  isUploadedCover,
  uploadedCoverKey,
  type CoverUploadMime,
} from "@cyberlearn/types";
import { createSupabaseAdminClient } from "@cyberlearn/db";

export const LESSON_COVER_BUCKET = "lesson-covers";
/** Signed-URL lifetime. 1h is the project's documented maximum for storage. */
export const LESSON_COVER_SIGNED_TTL_SECONDS = 60 * 60;

/**
 * Confirms the raw bytes actually match an allowed raster format, regardless of
 * the client-declared MIME type. Returns the trusted MIME or null on mismatch.
 */
function sniffImageMime(bytes: Uint8Array): CoverUploadMime | null {
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

export interface CoverUploadResult {
  marker?: string;
  /** A signed URL for the just-uploaded image, for immediate preview. */
  previewUrl?: string;
  error?: string;
}

/**
 * Validates and stores a lesson cover image in the private bucket.
 *
 * Security: allowlist of raster MIME types (no SVG), a size cap, and a
 * magic-byte check so the declared content-type cannot be spoofed. On success
 * the previous uploaded cover (if any) is best-effort removed to avoid orphans.
 *
 * Returns a `__cover:<key>` marker to store in Lesson.coverImageUrl.
 */
export async function uploadLessonCover(
  file: File,
  previousCover: string | null,
): Promise<CoverUploadResult> {
  if (file.size === 0) return { error: "Fichier vide." };
  if (file.size > COVER_UPLOAD_MAX_BYTES) {
    return { error: "Image trop lourde (4 Mo maximum)." };
  }
  if (!(COVER_UPLOAD_ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return { error: "Format non supporté. Utilise JPEG, PNG ou WebP." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImageMime(bytes);
  if (!sniffed || sniffed !== file.type) {
    return { error: "Le contenu du fichier ne correspond pas à une image valide." };
  }

  const key = `${randomUUID()}.${COVER_MIME_EXTENSION[sniffed]}`;
  const admin = createSupabaseAdminClient();

  const { error } = await admin.storage.from(LESSON_COVER_BUCKET).upload(key, bytes, {
    contentType: sniffed,
    upsert: false,
  });
  if (error) {
    return { error: "Échec de l'envoi de l'image. Réessaie." };
  }

  // Best-effort cleanup of the previous uploaded cover (ignore failures).
  const previousKey = uploadedCoverKey(previousCover);
  if (previousKey && previousKey !== key) {
    await admin.storage.from(LESSON_COVER_BUCKET).remove([previousKey]);
  }

  const marker = `${UPLOADED_COVER_PREFIX}${key}`;
  const previewUrl = await resolveLessonCoverSrc(marker);
  return { marker, ...(previewUrl ? { previewUrl } : {}) };
}

/** Removes a lesson's uploaded cover object, if the value is an upload marker. */
export async function deleteLessonCover(coverImageUrl: string | null): Promise<void> {
  const key = uploadedCoverKey(coverImageUrl);
  if (!key) return;
  const admin = createSupabaseAdminClient();
  await admin.storage.from(LESSON_COVER_BUCKET).remove([key]);
}

/**
 * Resolves a stored cover value for display:
 *   - `__cover:<key>` → a short-lived signed URL (or null if signing fails)
 *   - anything else   → returned unchanged (external URL or null).
 */
export async function resolveLessonCoverSrc(value: string | null): Promise<string | null> {
  if (!isUploadedCover(value)) return value;
  const key = uploadedCoverKey(value);
  if (!key) return null;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(LESSON_COVER_BUCKET)
    .createSignedUrl(key, LESSON_COVER_SIGNED_TTL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}
