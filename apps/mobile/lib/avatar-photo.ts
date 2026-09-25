import {
  AVATAR_EXPORT_PX,
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
 *
 * Before that, the photo is brought to what the site's cropper exports: a
 * square of AVATAR_EXPORT_PX, re-encoded as JPEG. A phone photo of any size or
 * format the phone can read (HEIC included) then fits well under the cap.
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

export const AVATAR_PHOTO_HINT = `Recadrée au carré et réduite à ${String(AVATAR_EXPORT_PX)} × ${String(AVATAR_EXPORT_PX)} pixels.`;

/** The JPEG quality of the reduced photo, the site cropper's. */
export const AVATAR_PHOTO_QUALITY = 0.9;

/**
 * How to bring a picked photo to the site's square: the centred square to cut
 * when it is not one already (the picker crops, but not every Android gallery
 * honours it), and the side to reduce it to, never enlarging a small photo.
 */
export function avatarPhotoTransform(
  width: number,
  height: number,
): {
  crop: { originX: number; originY: number; width: number; height: number } | null;
  size: number;
} {
  if (!(width > 0) || !(height > 0)) return { crop: null, size: AVATAR_EXPORT_PX };
  const side = Math.min(width, height);
  const crop =
    width === height
      ? null
      : {
          originX: Math.floor((width - side) / 2),
          originY: Math.floor((height - side) / 2),
          width: side,
          height: side,
        };
  return { crop, size: Math.min(side, AVATAR_EXPORT_PX) };
}

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
