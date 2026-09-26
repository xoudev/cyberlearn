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
import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { isIP } from "node:net";
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

const LESSON_COVER_BUCKET = "lesson-covers";
/** Signed-URL lifetime. 1h is the project's documented maximum for storage. */
const LESSON_COVER_SIGNED_TTL_SECONDS = 60 * 60;

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

  return storeCoverBytes(bytes, sniffed, previousCover);
}

/**
 * Stores already-validated image bytes in the private bucket, cleans up the
 * previous cover, and returns the marker plus a signed preview URL. Shared by
 * the file-upload and the URL-import paths.
 */
async function storeCoverBytes(
  bytes: Uint8Array,
  mime: CoverUploadMime,
  previousCover: string | null,
): Promise<CoverUploadResult> {
  const key = `${randomUUID()}.${COVER_MIME_EXTENSION[mime]}`;
  const admin = createSupabaseAdminClient();

  const { error } = await admin.storage.from(LESSON_COVER_BUCKET).upload(key, bytes, {
    contentType: mime,
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

// ── Import from an image URL ────────────────────────────────────────────────────

const COVER_FETCH_TIMEOUT_MS = 10_000;

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4) return true;
  const a = parts[0];
  const b = parts[1];
  if (a === undefined || b === undefined || Number.isNaN(a) || Number.isNaN(b)) return true;
  if (a === 0 || a === 10 || a === 127) return true; // this-host, private, loopback
  if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata 169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::") return true; // loopback / unspecified
  if (v.startsWith("fe80")) return true; // link-local
  if (v.startsWith("fc") || v.startsWith("fd")) return true; // unique local
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v); // IPv4-mapped
  if (mapped?.[1]) return isPrivateIpv4(mapped[1]);
  return false;
}

/**
 * Rejects non-https URLs and any host that resolves to a private/internal
 * address (SSRF guard). The import is admin-only, but this is defense in depth.
 */
async function validatePublicHttpsUrl(raw: string): Promise<{ url?: URL; error?: string }> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { error: "Lien invalide." };
  }
  if (url.protocol !== "https:") return { error: "Le lien doit commencer par https://." };

  const host = url.hostname;
  const literal = isIP(host);
  if (literal === 4) {
    if (isPrivateIpv4(host)) return { error: "Ce lien pointe vers une adresse interne." };
    return { url };
  }
  if (literal === 6) {
    if (isPrivateIpv6(host)) return { error: "Ce lien pointe vers une adresse interne." };
    return { url };
  }

  let addrs: LookupAddress[];
  try {
    addrs = await lookup(host, { all: true });
  } catch {
    return { error: "Hôte introuvable." };
  }
  if (addrs.length === 0) return { error: "Hôte introuvable." };
  for (const a of addrs) {
    const priv = a.family === 4 ? isPrivateIpv4(a.address) : isPrivateIpv6(a.address);
    if (priv) return { error: "Ce lien pointe vers une adresse interne." };
  }
  return { url };
}

/**
 * Downloads an image from a public https URL and re-hosts it in the private
 * bucket (so the catalog never depends on a third-party host or trips the CSP).
 * Same validation as a direct upload: allowlist MIME via magic bytes + size cap.
 */
export async function importLessonCoverFromUrl(
  rawUrl: string,
  previousCover: string | null,
): Promise<CoverUploadResult> {
  const checked = await validatePublicHttpsUrl(rawUrl);
  if (checked.error || !checked.url) return { error: checked.error ?? "Lien invalide." };

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, COVER_FETCH_TIMEOUT_MS);
  let resp: Response;
  try {
    // redirect: "error" stops a public host from bouncing us to an internal one.
    resp = await fetch(checked.url, { signal: controller.signal, redirect: "error" });
  } catch {
    return { error: "Impossible de récupérer l'image depuis ce lien." };
  } finally {
    clearTimeout(timeout);
  }

  if (!resp.ok) return { error: `Le lien a renvoyé une erreur (${String(resp.status)}).` };

  const declaredLength = Number(resp.headers.get("content-length") ?? "0");
  if (declaredLength > COVER_UPLOAD_MAX_BYTES) {
    return { error: "Image trop lourde (4 Mo maximum)." };
  }

  const bytes = new Uint8Array(await resp.arrayBuffer());
  if (bytes.byteLength === 0) return { error: "Le lien ne pointe pas vers une image." };
  if (bytes.byteLength > COVER_UPLOAD_MAX_BYTES) {
    return { error: "Image trop lourde (4 Mo maximum)." };
  }

  const sniffed = sniffImageMime(bytes);
  if (!sniffed) {
    return { error: "Le lien ne pointe pas vers une image JPEG, PNG ou WebP." };
  }

  return storeCoverBytes(bytes, sniffed, previousCover);
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
