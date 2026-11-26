import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminMfaPinRepository, userRepository } from "@cyberlearn/db";
import { ACCESS_DENIED_PATH, ADMIN_HOME } from "@/lib/auth-redirect";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AdminAuthShell } from "../../auth-shell";
import { CancelSignIn } from "../cancel-sign-in";

export const metadata: Metadata = { title: "Double authentification modifiée" };

/**
 * Where the console sends an administrator whose TOTP factors are no longer
 * the ones it pinned (requireAdminAction, admin_mfa_pins): a factor removed or
 * added from the site, which a stolen site session can do. The console stays
 * shut for that account until the recovery procedure (pnpm --filter
 * @cyberlearn/db db:reset-mfa, docs/authentication.md) clears its factors and
 * pins; the next enrolment is pinned in turn.
 *
 * Read again on each visit: once the pins are cleared, or the factors are
 * back as pinned, it sends the session on to the console.
 */
export default async function MfaChangedPage(): Promise<React.JSX.Element> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const role = await userRepository.findRoleById(user.id);
  if (role?.role !== "ADMIN") redirect(ACCESS_DENIED_PATH);

  const verified = (user.factors ?? [])
    .filter((factor) => factor.factor_type === "totp" && factor.status === "verified")
    .map((factor) => factor.id);
  // No factor at all is the setup's to deal with; a set that matches, or that
  // the recovery left unpinned, is the console's.
  if (verified.length === 0) redirect("/mfa/setup");
  if ((await adminMfaPinRepository.check(user.id, verified)) !== "changed") redirect(ADMIN_HOME);

  return (
    <AdminAuthShell
      eyebrow="Sécurité du compte"
      title="Double authentification modifiée"
      description="Les facteurs de ce compte ne sont plus ceux que la console connaît : un facteur a été retiré ou ajouté depuis le site. Par précaution, la console reste fermée pour ce compte."
    >
      <div className="a-auth-form">
        <p className="a-field-hint">
          Si ce n&apos;est pas toi, quelqu&apos;un a une session ouverte sur ton compte : change ton
          mot de passe sur le site, puis suis la procédure de secours.
        </p>
        <p className="a-field-hint">
          Pour rouvrir la console : la procédure de secours, <code>db:reset-mfa</code>, retire les
          facteurs du compte (docs/authentication.md). La prochaine activation sera reconnue.
        </p>
        <CancelSignIn label="Se déconnecter" className="a-btn a-btn--primary" />
      </div>
    </AdminAuthShell>
  );
}
