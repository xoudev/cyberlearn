import {
  AVATAR_MIME_EXTENSION,
  AVATAR_UPLOAD_ALLOWED_MIME,
  AVATAR_UPLOAD_ERROR,
  AVATAR_UPLOAD_MAX_BYTES,
  type AvatarUploadMime,
} from "@cyberlearn/types";

/**
 * Sending a photo as one's avatar from the phone. The server decides what it
 * accepts (apps/web/lib/avatar/storage.ts: JPEG, PNG or WebP, 2 Mo at most,
 * and bytes that match the declared type); this module refuses early what it
 * would refuse anyway, with the same words, and names the file it sends.
 */

/** What the image picker hands back, as far as the upload needs it. */
export interface PickedPhoto {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
}

/** A file on the phone, as React Native's FormData sends one. */
export interface PhotoPart {
  uri: string;
  name: string;
  type: AvatarUploadMime;
}

export const AVATAR_PHOTO_HINT = "JPEG, PNG ou WebP, 2 Mo au plus.";

const BY_EXTENSION: Record<string, AvatarUploadMime> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function isAllowedMime(value: string): value is AvatarUploadMime {
  return AVATAR_UPLOAD_ALLOWED_MIME.some((mime) => mime === value);
}

/** The photo's type: what the picker declared when it is allowed, else its extension. */
export function photoMimeOf(photo: PickedPhoto): AvatarUploadMime | null {
  const declared = photo.mimeType?.toLowerCase() ?? "";
  if (isAllowedMime(declared)) return declared;
  const source = (photo.fileName ?? photo.uri).split(/[?#]/)[0] ?? "";
  const extension = source.slice(source.lastIndexOf(".") + 1).toLowerCase();
  return BY_EXTENSION[extension] ?? null;
}

/** The part to send, or why the server would refuse it. */
export function photoUploadPart(
  photo: PickedPhoto,
): { ok: true; part: PhotoPart } | { ok: false; error: string } {
  const type = photoMimeOf(photo);
  if (type === null) return { ok: false, error: AVATAR_UPLOAD_ERROR.format };
  if (photo.fileSize === 0) return { ok: false, error: AVATAR_UPLOAD_ERROR.empty };
  if (typeof photo.fileSize === "number" && photo.fileSize > AVATAR_UPLOAD_MAX_BYTES) {
    return { ok: false, error: AVATAR_UPLOAD_ERROR.tooLarge };
  }
  return {
    ok: true,
    part: { uri: photo.uri, name: `avatar.${AVATAR_MIME_EXTENSION[type]}`, type },
  };
}
