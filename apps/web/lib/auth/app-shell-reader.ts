import { getActiveBan, getRequestUser } from "@/lib/auth";
import { needsMfaStep } from "@/lib/auth/password-flow";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The account to draw the app's shell for around a public page that a session
 * still owing its second-factor code may open (the legal texts, the contact
 * form: middleware.ts, isOpenToPendingMfa), or null to draw the visitors'
 * frame around it.
 *
 * The catalogue and the glossary ask two things (signed in, not banned): the
 * middleware sends a session that owes its code to /mfa before they render.
 * These pages are let through, for somebody who lost the phone, so they ask a
 * third: the shell shows the account (its name, its notifications, its
 * friends), which a session that has only typed the password has not proved
 * it owns. The level is read from the token, with no network call; an
 * unreadable one counts as owed (needsMfaStep), like everywhere else.
 *
 * A banned account reads them as a visitor does, since the app the shell leads
 * into is closed to it (the public profile's rule, app/u/[username]).
 */
export async function appShellReaderId(): Promise<string | null> {
  const viewer = await getRequestUser();
  if (viewer === null) return null;
  if ((await getActiveBan()) !== null) return null;
  const supabase = await getSupabaseServerClient();
  if (needsMfaStep(await supabase.auth.mfa.getAuthenticatorAssuranceLevel())) return null;
  return viewer.id;
}
