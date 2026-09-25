"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_ONBOARDING_AVATAR } from "@cyberlearn/lib/onboarding/avatars";
import { saveOnboardingAvatar } from "@/lib/onboarding/steps";

export interface SaveAvatarState {
  error?: string;
}

/** Step 2 on the site: the session, then the service the app uses too. */
export async function saveAvatar(
  _prev: SaveAvatarState,
  formData: FormData,
): Promise<SaveAvatarState> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const result = await saveOnboardingAvatar(
    user.id,
    formData.get("avatarUrl") ?? DEFAULT_ONBOARDING_AVATAR,
  );
  if (!result.ok) return { error: result.error };

  redirect("/onboarding/goals");
}
