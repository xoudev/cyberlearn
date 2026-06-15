// ─── Lesson cover upload ──────────────────────────────────────────────────────

// Uploaded lesson cover images live in a PRIVATE Supabase Storage bucket
// ("lesson-covers") and are never exposed by a public URL. The
// Lesson.coverImageUrl column holds a marker of the form `__cover:<uuid>.<ext>`;
// the catalog resolves it to a short-lived signed URL server-side. This mirrors
// the avatar upload scheme (`__upload:`). Buckets are private by default per the
// project storage convention, so no ADR is required for this one.
export const UPLOADED_COVER_PREFIX = "__cover:";

// Raster formats only. SVG is intentionally excluded: an SVG can carry inline
// scripts and would be an XSS vector when served from our origin.
export const COVER_UPLOAD_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export type CoverUploadMime = (typeof COVER_UPLOAD_ALLOWED_MIME)[number];

export const COVER_UPLOAD_MAX_BYTES = 4 * 1024 * 1024; // 4 MB

// Maps an allowed MIME type to the file extension used in the storage key.
export const COVER_MIME_EXTENSION: Record<CoverUploadMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** True when a cover value points to a privately-stored uploaded image. */
export function isUploadedCover(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith(UPLOADED_COVER_PREFIX);
}

/** Extracts the storage object key from an uploaded-cover marker, or null. */
export function uploadedCoverKey(value: string | null | undefined): string | null {
  return isUploadedCover(value) ? value.slice(UPLOADED_COVER_PREFIX.length) : null;
}
