import { notFound, redirect } from "next/navigation";
import { userRepository } from "@cyberlearn/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AdminAuthShell } from "../auth-shell";
import { AdminMfaChallenge } from "./admin-mfa-challenge";

export default async function AdminMfaPage(): Promise<React.JSX.Element> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await userRepository.findRoleById(user.id);
  if (role?.role !== "ADMIN") notFound();

  const factors = await supabase.auth.mfa.listFactors();
  if (factors.error || factors.data.totp.length === 0) redirect("/mfa/setup");
  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!assurance.error && assurance.data.currentLevel === "aal2") redirect("/dashboard");

  return (
    <AdminAuthShell
      eyebrow="Second facteur"
      title="Code MFA"
      description="Entre le code à six chiffres de ton application d'authentification."
    >
      <AdminMfaChallenge />
    </AdminAuthShell>
  );
}
