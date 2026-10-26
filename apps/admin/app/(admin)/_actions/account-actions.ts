"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auditLogRepository } from "@cyberlearn/db";
import { AUDIT_ACTION } from "@cyberlearn/db/audit-actions";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { requireAdminAction } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The administrator's own sessions, from « Mon compte ».
 *
 * The account page of another user closes its sessions through the database
 * (revokeAllSessionsAction), and refuses one's own: the session in use would
 * go with them. Here Supabase does it with the administrator's own token,
 * which can keep the session in use ("others") or close it too ("global").
 * Either way the gesture is written to the audit log, after the fact: by then
 * the sessions are closed, and a missing trace is said rather than turned
 * into an error that would invite a second click.
 */

export interface AccountActionState {
  ok?: boolean;
  error?: string;
  notice?: string;
  /** True when the sessions were closed but the audit row could not be written. */
  auditFailed?: boolean;
}

const scopeSchema = z.object({ scope: z.enum(["others", "global"]) });

/** The audit actions, by scope. */
const SIGN_OUT_ACTION = {
  others: AUDIT_ACTION.ownAccount.othersSignedOut,
  global: AUDIT_ACTION.ownAccount.allSignedOut,
} as const;

export async function signOutMySessionsAction(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const admin = await requireAdminAction();
  const parsed = scopeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Paramètres invalides." };
  const { scope } = parsed.data;

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope });
  if (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "own sign out failed");
    return { error: "La déconnexion a échoué. Aucune session n'a été fermée." };
  }

  let auditFailed = false;
  try {
    await auditLogRepository.record({
      actorId: admin.id,
      action: SIGN_OUT_ACTION[scope],
      targetType: "User",
      targetId: admin.id,
      metadata: { scope },
    });
  } catch (err) {
    auditFailed = true;
    logger.error({ scope: "admin", err: errorMessage(err) }, "own sign out not audited");
  }

  // This session went with the others: the console asks for the sign-in again.
  if (scope === "global") redirect("/login");

  return {
    ok: true,
    auditFailed,
    notice:
      "Tes autres sessions sont fermées : le site, l'app et la console redemandent la connexion partout ailleurs. Celle-ci reste ouverte.",
  };
}
