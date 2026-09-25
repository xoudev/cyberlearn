"use server";

import { revalidatePath } from "next/cache";
import { requireRequestUser } from "@/lib/auth";
import { updateProfileFor, type UpdateProfileResult } from "@/lib/profile/update-profile";

export type UpdateProfileState = UpdateProfileResult;

/**
 * Updates the signed-in user's display name, bio, and (optionally) a built-in
 * avatar: the session, then the service the app uses too
 * (@/lib/profile/update-profile), then the pages that show them.
 */
export async function updateProfileAction(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const authUser = await requireRequestUser();

  const result = await updateProfileFor(authUser.id, {
    displayName: formData.get("displayName"),
    bio: formData.get("bio"),
    avatarUrl: formData.get("avatarUrl"),
  });
  if (result.success) {
    revalidatePath("/settings/profile");
    revalidatePath("/profile");
  }
  return result;
}
