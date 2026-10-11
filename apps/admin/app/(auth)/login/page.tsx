import React from "react";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { type LoginError, loginErrorSchema, safeAdminRedirect } from "@/lib/auth-redirect";
import { learnerUrl } from "@/lib/learner-url";
import { AdminAuthShell } from "../auth-shell";
import { AdminLoginForm } from "./login-form";

/**
 * What /login?error= says. The codes come from the middleware, which knows
 * why it turned a request away; a code nobody wrote gets the generic line.
 */
const ERROR_MESSAGES: Record<LoginError, string> = {
  session_expired: "Ta session a expiré. Reconnecte-toi pour reprendre où tu en étais.",
  auth_unavailable: "Le service d'authentification ne répond pas. Réessaie dans un instant.",
};

const GENERIC_ERROR = "La connexion a échoué. Réessaie.";

/**
 * The sentence for `?error=`, a value anybody can put in a link. It is checked
 * against the middleware's codes, never looked up as it comes: on a plain
 * object `?error=toString` finds a function, which the client form cannot be
 * handed, and the only way into the console rendered the error page.
 */
function loginErrorMessage(value: string | string[] | undefined): string | null {
  if (value === undefined || value.length === 0) return null;
  const code = loginErrorSchema.safeParse(value);
  return code.success ? ERROR_MESSAGES[code.data] : GENERIC_ERROR;
}

/**
 * The learner site's reset page: admins set and recover their password there
 * (docs/authentication.md). Built from the deployment's own site URL, so a
 * preview or a local console points at its own site rather than production.
 * A misconfigured URL hides the link instead of taking the sign-in page down.
 */
function forgotPasswordUrl(): string | null {
  try {
    return learnerUrl("/forgot-password");
  } catch (error) {
    logger.error(
      { scope: "admin.login", err: errorMessage(error) },
      "forgot-password link unavailable",
    );
    return null;
  }
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string | string[]; error?: string | string[] }>;
}): Promise<React.JSX.Element> {
  const params = await searchParams;
  const initialError = loginErrorMessage(params.error);

  return (
    <AdminAuthShell
      eyebrow="Console d'administration"
      title="Accès restreint"
      description="Mot de passe et double authentification obligatoires pour chaque session administrative."
    >
      <AdminLoginForm
        redirectTo={safeAdminRedirect(params.redirectTo)}
        initialError={initialError}
        forgotPasswordUrl={forgotPasswordUrl()}
      />
    </AdminAuthShell>
  );
}
