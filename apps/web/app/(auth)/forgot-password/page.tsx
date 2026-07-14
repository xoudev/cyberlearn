import { AuthShell } from "../_components/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage(): React.JSX.Element {
  return (
    <AuthShell
      eyebrow="Récupération"
      contextTitle="Rétablis ton accès."
      contextText="Le lien de récupération est temporaire et ne peut être utilisé qu’une seule fois."
      title="Mot de passe oublié"
      description="Entre ton adresse e-mail pour recevoir un lien sécurisé."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
