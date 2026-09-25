"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { saveOnboardingProfile } from "@/lib/onboarding/steps";

export interface OnboardingActionState {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
}

/** Step 1 on the site: the session, then the service the app uses too. */
export async function completeOnboarding(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const result = await saveOnboardingProfile(user.id, {
    username: formData.get("username"),
    displayName: formData.get("displayName"),
    bio: formData.get("bio") ?? undefined,
  });

  if (!result.ok) {
    const errors: Record<string, string[]> = {};
    for (const [field, message] of Object.entries(result.errors)) errors[field] = [message];
    return { success: false, errors };
  }

  // onboarding_complete is set only after the avatar + goals steps
  redirect("/onboarding/avatar");
}
