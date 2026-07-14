import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AuthShell } from "../_components/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage(): Promise<React.JSX.Element> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password");

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
