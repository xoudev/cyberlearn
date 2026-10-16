import { redirect } from "next/navigation";
import { userRepository } from "@cyberlearn/db";
import { ACCESS_DENIED_PATH, safeAdminRedirect, withReturnPath } from "@/lib/auth-redirect";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AdminAuthShell } from "../../auth-shell";
import { AdminMfaSetup } from "./admin-mfa-setup";

export default async function AdminMfaSetupPage({
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
  // Not an administrator: no factor to enrol here, but a screen that says so
  // and signs the session out, rather than a 404 with no way back.
  if (role?.role !== "ADMIN") redirect(ACCESS_DENIED_PATH);

  const factors = await supabase.auth.mfa.listFactors();
  if (!factors.error && factors.data.totp.length > 0) {
    redirect(withReturnPath("/mfa", "next", next));
  }

  return (
    <AdminAuthShell
      eyebrow="Protection obligatoire"
      title="Activer le MFA"
      description="Scanne le QR code avec une application TOTP. Aucun accès administrateur n'est possible sans ce facteur."
    >
      <AdminMfaSetup next={next} />
    </AdminAuthShell>
  );
}
