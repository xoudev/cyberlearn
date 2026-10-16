import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { userRepository } from "@cyberlearn/db";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { ADMIN_HOME } from "@/lib/auth-redirect";
import { learnerSiteUrl } from "@/lib/learner-url";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AdminAuthShell } from "../auth-shell";
import { CancelSignIn } from "../mfa/cancel-sign-in";

export const metadata: Metadata = { title: "Accès réservé" };

/**
 * The learner site, for somebody who came to the wrong place. A misconfigured
 * URL hides the link rather than taking down the one screen that signs a
 * stuck session out.
 */
function siteUrl(): string | null {
  try {
    return learnerSiteUrl();
  } catch (error) {
    logger.error(
      { scope: "admin.access-denied", err: errorMessage(error) },
      "site link unavailable",
    );
    return null;
  }
}

/**
 * Where a session whose account is not ADMIN ends up: every console page, every
 * action and both TOTP screens send it here (requireAdminAction). It used to
 * get a 404 from all of them, /login included, and no page offered to sign
 * out. The role is read from the database, as everywhere else in the console.
 */
export default async function AccessDeniedPage(): Promise<React.JSX.Element> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // An administrator after all - promoted again, or here from an old link -
  // has the console to go to, through its usual checks.
  const role = await userRepository.findRoleById(user.id);
  if (role?.role === "ADMIN") redirect(ADMIN_HOME);

  const site = siteUrl();
  return (
    <AdminAuthShell
      eyebrow="Console d'administration"
      title="Accès réservé aux administrateurs"
      description="Ce compte n'a pas le rôle ADMIN : la console ne lui est pas ouverte. Déconnecte-toi pour revenir à la connexion avec un compte administrateur."
    >
      <div className="a-auth-form">
        {user.email ? <p className="a-field-hint">Compte connecté : {user.email}</p> : null}
        <CancelSignIn label="Se déconnecter" className="a-btn a-btn--primary" />
        {site !== null ? (
          <a className="a-card-link" style={{ justifySelf: "start" }} href={site}>
            Aller sur le site
          </a>
        ) : null}
      </div>
    </AdminAuthShell>
  );
}
