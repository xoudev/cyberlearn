"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import { AVATAR_PATHS, UPLOADED_AVATAR_PREFIX } from "@cyberlearn/types";
import { requireRequestUser } from "@/lib/auth";

export interface UpdateProfileState {
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
 * Updates the signed-in user's display name, bio, and (optionally) a built-in
 * avatar. Auth-first, then Zod safeParse.
 *
 * Avatar handling: this action only ever SETS a built-in SVG avatar (validated
 * against the allowlist). A recognized marker (`__upload:` custom upload or
 * `__glyph:`) is left untouched - those are managed by their own flows, so the
 * user can edit name/bio without disturbing a custom avatar. Any other value is
 * rejected, so a client cannot inject an arbitrary path or storage marker.
 * Username is not editable here.
 */
export async function updateProfileAction(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const authUser = await requireRequestUser();

  const parsed = profileFieldsSchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio") ?? undefined,
  });
  if (!parsed.success) {
    return { error: "Profil invalide. Vérifiez les champs." };
  }

  const { displayName, bio } = parsed.data;

  // Decide whether to write a new avatar. undefined => leave it unchanged.
  let avatarToSet: string | undefined;
  const rawAvatar = formData.get("avatarUrl");
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
    where: { id: authUser.id },
    data: {
      displayName,
      bio: bio && bio.length > 0 ? bio : null,
      ...(avatarToSet !== undefined ? { avatarUrl: avatarToSet } : {}),
    },
  });

  revalidatePath("/settings/profile");
  revalidatePath("/profile");
  return { success: true };
}
