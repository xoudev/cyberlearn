"use server";

import { z } from "zod";
import { requireAdminAction } from "@/lib/auth";
import { importLessonCoverFromUrl, uploadLessonCover } from "@/lib/lesson-cover/storage";

export interface UploadCoverState {
  ok?: boolean;
  /** The stored `__cover:` marker, written into the hidden form field. */
  marker?: string;
  /** Signed URL for immediate preview. */
  previewUrl?: string;
  error?: string;
}

// The cover the form held before this one (a `__cover:` marker or a URL), so
// that a replaced upload does not stay in the bucket. Absent on a new lesson.
const previousSchema = z.string().max(2048).nullable();

const uploadSchema = z.object({
  cover: z.instanceof(File, { message: "Aucun fichier reçu." }),
  previous: previousSchema,
});

const importSchema = z.object({
  // Only its shape here: https and a public host are checked where it is fetched.
  url: z.string().trim().min(1, "Aucun lien fourni.").max(2048, "Ce lien est trop long."),
  previous: previousSchema,
});

/** The first message of a failed parse, for the form. */
function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Formulaire invalide.";
}

/**
 * Validates and stores an admin-uploaded lesson cover in the private bucket.
 * Returns the marker (to persist in coverImageUrl) and a signed preview URL.
 * Does not touch the lesson row - the form submit persists the marker.
 */
export async function uploadLessonCoverAction(
  _prev: UploadCoverState,
  formData: FormData,
): Promise<UploadCoverState> {
  await requireAdminAction();

  const parsed = uploadSchema.safeParse({
    cover: formData.get("cover"),
    previous: formData.get("previous"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const result = await uploadLessonCover(parsed.data.cover, parsed.data.previous);
  if (result.error || !result.marker) {
    return { error: result.error ?? "Échec de l'envoi." };
  }

  return {
    ok: true,
    marker: result.marker,
    ...(result.previewUrl ? { previewUrl: result.previewUrl } : {}),
  };
}

/**
 * Imports a lesson cover from a public image URL by re-hosting it in the private
 * bucket. Same validated output as a direct upload (marker + signed preview).
 */
export async function importLessonCoverFromUrlAction(
  _prev: UploadCoverState,
  formData: FormData,
): Promise<UploadCoverState> {
  await requireAdminAction();

  const parsed = importSchema.safeParse({
    url: formData.get("url") ?? "",
    previous: formData.get("previous"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const result = await importLessonCoverFromUrl(parsed.data.url, parsed.data.previous);
  if (result.error || !result.marker) {
    return { error: result.error ?? "Échec de l'import." };
  }

  return {
    ok: true,
    marker: result.marker,
    ...(result.previewUrl ? { previewUrl: result.previewUrl } : {}),
  };
}
