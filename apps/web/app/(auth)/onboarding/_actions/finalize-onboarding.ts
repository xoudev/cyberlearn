"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@cyberlearn/db/supabase/admin";
import { redirect } from "next/navigation";

export async function setOnboardingComplete(userId: string): Promise<void> {
  const adminClient = createSupabaseAdminClient();
  await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: { onboarding_complete: true },
  });
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
