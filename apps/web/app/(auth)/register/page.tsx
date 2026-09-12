import type { Metadata } from "next";
import { AuthShell } from "../_components/auth-shell";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Inscription",
  description: "Crée gratuitement ton compte CyberLearn et commence ton premier parcours.",
  alternates: { canonical: "/register" },
};

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
