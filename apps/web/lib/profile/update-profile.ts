import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import { AVATAR_PATHS, UPLOADED_AVATAR_PREFIX } from "@cyberlearn/types";

/**
 * Editing one's own profile: the name shown, the bio, and optionally one of
 * the built-in avatars. Shared by the site's /settings/profile and the app
 * (/api/mobile/settings/profile), so both accept exactly the same values.
 *
 * Callers are responsible for AUTHENTICATION: `userId` must be a verified
 * identity, of an account that is not banned (requireRequestUser on the site,
 * userFromBearer in the app). Lives outside any "use server" module so it
 * cannot be invoked with an arbitrary userId.
 */

export interface UpdateProfileResult {
  success?: boolean;
  error?: string;
}

const profileFieldsSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(64, "Display name must be at most 64 characters"),
  bio: z.string().trim().max(280, "Bio must be at most 280 characters").optional(),
});

/**
 * Avatar handling: this only ever SETS a built-in SVG avatar (validated
 * against the allowlist). A recognized marker (`__upload:` custom upload or
 * `__glyph:`) is left untouched - those are managed by their own flows, so the
 * user can edit name/bio without disturbing a custom avatar. Any other value
 * is rejected, so a client cannot inject an arbitrary path or storage marker.
 * Username is not editable here.
 */
export async function updateProfileFor(
  userId: string,
  input: { displayName: unknown; bio: unknown; avatarUrl: unknown },
): Promise<UpdateProfileResult> {
  const parsed = profileFieldsSchema.safeParse({
    displayName: input.displayName,
    bio: input.bio ?? undefined,
  });
  if (!parsed.success) {
    return { error: "Profil invalide. Vérifiez les champs." };
  }

  const { displayName, bio } = parsed.data;

  // Decide whether to write a new avatar. undefined => leave it unchanged.
  let avatarToSet: string | undefined;
  const rawAvatar = input.avatarUrl;
  if (typeof rawAvatar === "string" && rawAvatar.length > 0) {
    if ((AVATAR_PATHS as readonly string[]).includes(rawAvatar)) {
      avatarToSet = rawAvatar;
    } else if (rawAvatar.startsWith(UPLOADED_AVATAR_PREFIX) || rawAvatar.startsWith("__glyph:")) {
      // Managed by the upload / glyph flows: keep the stored value as-is.
      avatarToSet = undefined;
    } else {
      return { error: "Avatar invalide." };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      displayName,
      bio: bio && bio.length > 0 ? bio : null,
      ...(avatarToSet !== undefined ? { avatarUrl: avatarToSet } : {}),
    },
  });
  return { success: true };
}
