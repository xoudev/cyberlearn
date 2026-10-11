import { notFound, redirect } from "next/navigation";
import { userRepository } from "@cyberlearn/db";
import { safeAdminRedirect, withReturnPath } from "@/lib/auth-redirect";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AdminAuthShell } from "../auth-shell";
import { AdminMfaChallenge } from "./admin-mfa-challenge";

export default async function AdminMfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}): Promise<React.JSX.Element> {
  // The page the admin was going to, checked like the sign-in's redirectTo.
  const next = safeAdminRedirect((await searchParams).next);

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(withReturnPath("/login", "redirectTo", next));
  const role = await userRepository.findRoleById(user.id);
  if (role?.role !== "ADMIN") notFound();

  const factors = await supabase.auth.mfa.listFactors();
  if (factors.error || factors.data.totp.length === 0) {
    redirect(withReturnPath("/mfa/setup", "next", next));
  }
  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!assurance.error && assurance.data.currentLevel === "aal2") redirect(next);

  return (
    <AdminAuthShell
      eyebrow="Second facteur"
      title="Code MFA"
      description="Entre le code à six chiffres de ton application d'authentification."
    >
      <AdminMfaChallenge next={next} />
    </AdminAuthShell>
  );
}
