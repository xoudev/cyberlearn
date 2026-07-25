"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { setOnboardingComplete } from "@/lib/onboarding/finalize";

// setOnboardingComplete used to be exported from here. Every export of a
// "use server" file is a callable endpoint, and it takes a userId parameter
// while writing to Supabase Auth with the service-role key - so a caller could
// flip app_metadata on any account. It now sits in @/lib/onboarding/finalize,
// reachable from the server only, and the action below derives the user from
// the session.

export async function skipOnboarding(): Promise<never> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await setOnboardingComplete(user.id);
  redirect("/dashboard");
}
