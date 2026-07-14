import { redirect } from "next/navigation";
import { authRedirectSchema } from "@cyberlearn/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AuthShell } from "../_components/auth-shell";
import { MfaChallengeForm } from "./mfa-challenge-form";

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}): Promise<React.JSX.Element> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const next = authRedirectSchema.safeParse(params.next ?? "/dashboard").data ?? "/dashboard";
  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!assurance.error && assurance.data.currentLevel === "aal2") redirect(next);

  return (
    <AuthShell
      eyebrow="Double authentification"
      contextTitle="Confirme que c’est bien toi."
      contextText="Le second facteur protège ton compte même si ton mot de passe est compromis."
      title="Code de sécurité"
      description="Entre le code à six chiffres généré par ton application d’authentification."
    >
      <MfaChallengeForm next={next} />
    </AuthShell>
  );
}
