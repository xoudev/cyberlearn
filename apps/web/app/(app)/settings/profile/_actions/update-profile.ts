"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import { AVATAR_PATHS } from "@cyberlearn/types";
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
 * against the allowlist). Custom uploaded avatars are managed exclusively by
 * uploadAvatarAction, so a non-built-in avatarUrl (e.g. an `__upload:` marker)
 * is ignored here rather than written - this preserves an existing custom
 * avatar when the user edits name/bio, and prevents a client from injecting an
 * arbitrary storage marker. Username is not editable here.
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
  const rawAvatar = formData.get("avatarUrl");
  const avatarIsBuiltin =
    typeof rawAvatar === "string" && (AVATAR_PATHS as readonly string[]).includes(rawAvatar);

  await prisma.user.update({
    where: { id: authUser.id },
    data: {
      displayName,
      bio: bio && bio.length > 0 ? bio : null,
      ...(avatarIsBuiltin ? { avatarUrl: rawAvatar } : {}),
    },
  });

  revalidatePath("/settings/profile");
  revalidatePath("/profile");
  return { success: true };
}
