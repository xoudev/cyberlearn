import React from "react";
import { userRepository } from "@cyberlearn/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingForm } from "./_components/onboarding-form";
import { OnboardingShell } from "./_components/onboarding-shell";
import { profileStepView } from "@/lib/onboarding/profile-step";

/**
 * Step 1: the handle, the name shown and the bio.
 *
 * Once a handle exists the step is done and the page moves on to the avatar,
 * unless the reader came back on purpose ("← Retour" on step 2 sends
 * `?edit=1`): then the form shows again, filled with what they wrote, as the
 * app's onboarding does when going back.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await userRepository.findOnboardingProfile(user.id);

  const view = profileStepView(dbUser, await searchParams);
  if (view === "done") redirect("/onboarding/avatar");

  return (
    <OnboardingShell step={1} stepName="Identité" panelTitle="Créer ton profil" panelTag="01/03">
      <OnboardingForm
        initialUsername={view.username}
        initialDisplayName={view.displayName}
        initialBio={view.bio}
        avatarUrl={dbUser?.avatarUrl ?? null}
      />
    </OnboardingShell>
  );
}
