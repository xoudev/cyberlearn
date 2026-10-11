import type { Metadata } from "next";
import { z } from "zod";
import { authRedirectSchema } from "@cyberlearn/types";
import { AuthShell } from "../_components/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connecte-toi à ton espace CyberLearn et reprends ta progression.",
  alternates: { canonical: "/login" },
};

/** The codes the auth routes (`/auth/callback`, `/auth/confirm`) send to /login. */
const loginErrorSchema = z.enum([
  "rate_limited",
  "missing_code",
  "auth_failed",
  "no_user",
  "profile_sync_failed",
]);

const ERROR_MESSAGES: Record<z.infer<typeof loginErrorSchema>, string> = {
  rate_limited: "Trop de tentatives. Réessaie dans 15 minutes.",
  missing_code: "Le lien de connexion est incomplet.",
  auth_failed: "Le lien de connexion a expiré ou n’est plus valide.",
  no_user: "Aucun compte valide n’a été trouvé.",
  profile_sync_failed: "La session n’a pas pu être initialisée. Réessaie dans un instant.",
};

const GENERIC_ERROR = "La connexion a échoué.";

/**
 * The sentence for `?error=`, a value anybody can put in a link. It is checked
 * against the known codes, never looked up as it comes: on a plain object
 * `?error=toString` finds a function, which the client form cannot be handed,
 * and the sign-in page failed to render. Any other value gets the generic line.
 */
function loginErrorMessage(value: string | string[] | undefined): string | null {
  if (value === undefined || value.length === 0) return null;
  const code = loginErrorSchema.safeParse(value);
  return code.success ? ERROR_MESSAGES[code.data] : GENERIC_ERROR;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string | string[]; error?: string | string[] }>;
}): Promise<React.JSX.Element> {
  const params = await searchParams;
  const redirectTo =
    authRedirectSchema.safeParse(params.redirectTo ?? "/dashboard").data ?? "/dashboard";
  const initialError = loginErrorMessage(params.error);

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
