import { prisma } from "@cyberlearn/db";
import { AVATAR_UPLOAD_ERROR } from "@cyberlearn/types";
import { uploadUserAvatar } from "./storage";

/**
 * Sets somebody's avatar to a photo they sent: stored in the private bucket by
 * uploadUserAvatar (type allowlist, 2 Mo cap, magic bytes), then the account
 * pointed at it. Shared by the site's form (uploadAvatarAction) and the app
 * (POST /api/mobile/avatar), so a photo is checked the same way from both.
 *
 * Callers are responsible for AUTHENTICATION: `userId` must be a verified
 * identity. Lives outside any "use server" module so it cannot be invoked
 * with an arbitrary userId.
 */

export type AvatarPhotoResult = { ok: true; marker: string } | { ok: false; error: string };

export async function setAvatarPhotoFor(userId: string, file: unknown): Promise<AvatarPhotoResult> {
  if (!(file instanceof File)) return { ok: false, error: AVATAR_UPLOAD_ERROR.missing };

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });

  const result = await uploadUserAvatar(userId, file, current?.avatarUrl ?? null);
  if (result.error !== undefined || result.marker === undefined) {
    return { ok: false, error: result.error ?? AVATAR_UPLOAD_ERROR.storage };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: result.marker },
  });
  return { ok: true, marker: result.marker };
}
