import { notFound, redirect } from "next/navigation";
import { userRepository } from "@cyberlearn/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Requires an ADMIN session that has completed the mandatory TOTP challenge. */
export async function requireAdminAction(): Promise<{
  id: string;
  email: string | undefined;
  role: "ADMIN";
}> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await userRepository.findRoleById(user.id);
  if (dbUser?.role !== "ADMIN") notFound();

  const factors = await supabase.auth.mfa.listFactors();
  if (factors.error || factors.data.totp.length === 0) redirect("/mfa/setup");
  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance.error || assurance.data.currentLevel !== "aal2") redirect("/mfa");

  return { id: user.id, email: user.email, role: "ADMIN" };
}
