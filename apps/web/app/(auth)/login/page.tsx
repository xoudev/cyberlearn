import { authRedirectSchema } from "@cyberlearn/types";
import { AuthShell } from "../_components/auth-shell";
import { LoginForm } from "./login-form";

const ERROR_MESSAGES: Record<string, string> = {
  rate_limited: "Trop de tentatives. Réessaie dans 15 minutes.",
  missing_code: "Le lien de connexion est incomplet.",
  auth_failed: "Le lien de connexion a expiré ou n’est plus valide.",
  no_user: "Aucun compte valide n’a été trouvé.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}): Promise<React.JSX.Element> {
  const params = await searchParams;
  const redirectTo =
    authRedirectSchema.safeParse(params.redirectTo ?? "/dashboard").data ?? "/dashboard";
  const initialError = params.error
    ? (ERROR_MESSAGES[params.error] ?? "La connexion a échoué.")
    : null;

  return (
    <AuthShell
      eyebrow="Accès sécurisé"
      contextTitle="Reprends ta progression."
      contextText="Ton espace CyberLearn, tes parcours et tes notes restent synchronisés sur tous tes appareils."
      title="Connexion"
      description="Utilise l’adresse e-mail associée à ton compte."
    >
      <LoginForm redirectTo={redirectTo} initialError={initialError} />
    </AuthShell>
  );
}
