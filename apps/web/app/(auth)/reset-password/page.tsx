import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RECOVERY_EXPIRED_MESSAGE, hasRecoveryGrant } from "@/lib/auth/recovery-grant";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AuthShell } from "../_components/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";
import { RestartRecovery } from "./restart-recovery";

export default async function ResetPasswordPage(): Promise<React.JSX.Element> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password");

  // Without the grant the form would ask for the current password, which it
  // has no field for: the link has lapsed, or this is a page from the history.
  if (!hasRecoveryGrant(await cookies())) {
    return (
      <AuthShell
        eyebrow="Nouvel accès"
        contextTitle="Choisis une nouvelle clé."
        contextText="Utilise un mot de passe unique que tu ne réutilises sur aucun autre service."
        title="Lien expiré"
        description="Une fois le lien de l’e-mail ouvert, tu as 15 minutes pour choisir ton nouveau mot de passe."
      >
        <RestartRecovery message={RECOVERY_EXPIRED_MESSAGE} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Nouvel accès"
      contextTitle="Choisis une nouvelle clé."
      contextText="Utilise un mot de passe unique que tu ne réutilises sur aucun autre service."
      title="Nouveau mot de passe"
      description="Toutes les prochaines connexions utiliseront ce mot de passe."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
