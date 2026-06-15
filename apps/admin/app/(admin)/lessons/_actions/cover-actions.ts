"use server";

import { requireAdminAction } from "@/lib/auth";
import { uploadLessonCover } from "@/lib/lesson-cover/storage";

export interface UploadCoverState {
  ok?: boolean;
  /** The stored `__cover:` marker, written into the hidden form field. */
  marker?: string;
  /** Signed URL for immediate preview. */
  previewUrl?: string;
  error?: string;
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

  const file = formData.get("cover");
  if (!(file instanceof File)) return { error: "Aucun fichier reçu." };

  const previous = formData.get("previous");
  const result = await uploadLessonCover(file, typeof previous === "string" ? previous : null);
  if (result.error || !result.marker) {
    return { error: result.error ?? "Échec de l'envoi." };
  }

  return {
    ok: true,
    marker: result.marker,
    ...(result.previewUrl ? { previewUrl: result.previewUrl } : {}),
  };
}
