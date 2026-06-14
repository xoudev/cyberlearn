"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@cyberlearn/db/supabase/admin";
import { redirect } from "next/navigation";

export async function setOnboardingComplete(userId: string): Promise<void> {
  const adminClient = createSupabaseAdminClient();
  await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: { onboarding_complete: true },
  });

  // app_metadata is embedded in the access-token JWT, and updateUserById does
  // NOT refresh the caller's token. The middleware reads onboarding_complete
  // from that JWT, so without an explicit refresh it keeps seeing the stale
  // value and bounces the user back into onboarding (the "stuck on avatar"
  // bug after finishing or skipping the placement test). Refreshing the
  // session here re-mints the token with the new flag and writes the updated
  // auth cookies before the action's redirect. This must run in a Server
  // Action / Route Handler context (where cookies are writable), which is the
  // case for both callers (submitPlacementTest, skipOnboarding).
  const supabase = await getSupabaseServerClient();
  await supabase.auth.refreshSession();
}

export async function skipOnboarding(): Promise<never> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await setOnboardingComplete(user.id);
  redirect("/dashboard");
}
