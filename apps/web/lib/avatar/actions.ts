"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { setAvatarPhotoFor } from "@/lib/avatar/upload";

export interface UploadAvatarState {
  ok?: boolean;
  error?: string;
  /** The stored marker, so the client can preview without a round-trip. */
  avatarUrl?: string;
}

/**
 * The site's end of sending a photo: the session, then the service the app
 * uses too (@/lib/avatar/upload). Shared by onboarding and settings. Does not
 * redirect: callers decide what to do on success (onboarding advances,
 * settings stays and revalidates).
 */
export async function uploadAvatarAction(
  _prev: UploadAvatarState,
  formData: FormData,
): Promise<UploadAvatarState> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée. Reconnecte-toi." };

  const result = await setAvatarPhotoFor(user.id, formData.get("avatar"));
  if (!result.ok) return { error: result.error };

  // Refresh the surfaces that show the avatar (the navbar lives in the app layout).
  revalidatePath("/settings/profile");
  revalidatePath("/profile");
  revalidatePath("/", "layout");

  return { ok: true, avatarUrl: result.marker };
}
