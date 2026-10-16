"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { saveOnboardingProfile } from "@/lib/onboarding/steps";

/** What the identity form held when it was sent. */
export interface OnboardingFormValues {
  username: string;
  displayName: string;
  bio: string;
}

export interface OnboardingActionState {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
  /**
   * The fields as they were typed, handed back after a refusal. React resets
   * an uncontrolled form once its action has run: without these, "Ce nom
   * d'utilisateur est déjà pris" also cost the name shown and the bio.
   */
  values?: OnboardingFormValues;
}

/** A field as it was typed, never longer than the form lets it be. */
function typed(formData: FormData, name: string, max: number): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.slice(0, max) : "";
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
    return {
      success: false,
      errors,
      values: {
        username: typed(formData, "username", 32),
        displayName: typed(formData, "displayName", 64),
        bio: typed(formData, "bio", 280),
      },
    };
  }

  // onboarding_complete is set only after the avatar + goals steps
  redirect("/onboarding/avatar");
}
