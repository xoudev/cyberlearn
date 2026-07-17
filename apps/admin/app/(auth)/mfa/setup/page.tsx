import { notFound, redirect } from "next/navigation";
import { userRepository } from "@cyberlearn/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AdminAuthShell } from "../../auth-shell";
import { AdminMfaSetup } from "./admin-mfa-setup";

export default async function AdminMfaSetupPage(): Promise<React.JSX.Element> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await userRepository.findRoleById(user.id);
  if (role?.role !== "ADMIN") notFound();

  const factors = await supabase.auth.mfa.listFactors();
  if (!factors.error && factors.data.totp.length > 0) redirect("/mfa");

  return (
    <AdminAuthShell
      eyebrow="Protection obligatoire"
      title="Activer le MFA"
      description="Scanne le QR code avec une application TOTP. Aucun accès administrateur n'est possible sans ce facteur."
    >
      <AdminMfaSetup />
    </AdminAuthShell>
  );
}
