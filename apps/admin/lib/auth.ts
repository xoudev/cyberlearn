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

  // The verified TOTP factors ride on the user object already fetched above -
  // calling mfa.listFactors() would trigger a second network roundtrip.
  const hasVerifiedTotp =
    user.factors?.some((factor) => factor.factor_type === "totp" && factor.status === "verified") ??
    false;
  if (!hasVerifiedTotp) redirect("/mfa/setup");

  const [dbUser, assurance] = await Promise.all([
    userRepository.findRoleById(user.id),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (dbUser?.role !== "ADMIN") notFound();
  if (assurance.error || assurance.data.currentLevel !== "aal2") redirect("/mfa");

  return { id: user.id, email: user.email, role: "ADMIN" };
}
