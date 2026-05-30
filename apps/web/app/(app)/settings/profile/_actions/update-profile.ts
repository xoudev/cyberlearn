"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@cyberlearn/db";
import { settingsProfileSchema } from "@cyberlearn/types";
import { requireRequestUser } from "@/lib/auth";

export interface UpdateProfileState {
  success?: boolean;
  error?: string;
}

/**
 * Updates the signed-in user's display name, bio, and avatar.
 *
 * Auth-first, then Zod safeParse. avatarUrl is validated against the built-in
 * SVG allowlist (settingsProfileSchema) — an arbitrary string is rejected.
 * Username is intentionally not editable here.
 */
export async function updateProfileAction(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const authUser = await requireRequestUser();

  const parsed = settingsProfileSchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio") ?? undefined,
    avatarUrl: formData.get("avatarUrl"),
  });
  if (!parsed.success) {
    return { error: "Profil invalide. Vérifiez les champs." };
  }

  const { displayName, bio, avatarUrl } = parsed.data;

  await prisma.user.update({
    where: { id: authUser.id },
    data: {
      displayName,
      bio: bio && bio.length > 0 ? bio : null,
      avatarUrl,
    },
  });

  revalidatePath("/settings/profile");
  revalidatePath("/profile");
  return { success: true };
}
