"use server";

import { errorMessage } from "@cyberlearn/lib/logger";
import { requireRequestUser } from "@/lib/auth";
import { checkSessionsSignOut } from "@/lib/rate-limit";
import { waitLabel } from "@/lib/rate-limit-copy";
import { requestLogger } from "@/lib/request-logger";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { SignOutOthersState } from "./sign-out-others-state";

/**
 * Closes every session of the account but this one: the other browsers, and
 * the app on a phone.
 *
 * A learner had no way to do it. Somebody who signed in on a school computer
 * and left, or lost a phone, could only change the password, which closes
 * nothing that is already open. The console has had the gesture for its
 * administrators; this is the same call to Supabase Auth, for everybody.
 *
 * It takes no input, not even the form's: the account is the session's, and
 * "the others" is the only scope there is to ask for. Signing out here too is
 * the navbar's own button.
 */
export async function signOutOtherSessions(): Promise<SignOutOthersState> {
  const user = await requireRequestUser();

  const limit = await checkSessionsSignOut(user.id);
  if (!limit.success) {
    return {
      status: "error",
      message: `Trop de demandes. Réessaie dans ${waitLabel(limit.retryAfterSeconds)}.`,
    };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) {
    const log = await requestLogger();
    log.error({ scope: "settings/sessions", err: errorMessage(error) }, "sign out others failed");
    return {
      status: "error",
      message: "La déconnexion a échoué : aucune session n’a été fermée. Réessaie.",
    };
  }

  return {
    status: "done",
    message:
      "Tes autres sessions sont fermées : le site et l’app redemanderont la connexion partout ailleurs. Celle-ci reste ouverte.",
  };
}
