import { AuthShell } from "../_components/auth-shell";
import { RegisterForm } from "./register-form";

export default function RegisterPage(): React.JSX.Element {
  return (
    <AuthShell
      eyebrow="Nouveau profil"
      contextTitle="Construis ton arsenal."
      contextText="Crée ton identité CyberLearn puis choisis ton parcours entre développement, cybersécurité et réseau."
      title="Inscription"
      description="Ton e-mail devra être vérifié avant la première connexion."
    >
      <RegisterForm />
    </AuthShell>
  );
}
