"use server";

import * as Sentry from "@sentry/nextjs";
import { authRedirectSchema } from "@cyberlearn/types";
import { resolveUserPostSignInRoute } from "@/lib/auth/password-flow";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Finishes a sign-in that stopped at the MFA challenge.
 *
 * resolveUserPostSignInRoute sends a session that still owes its code to /mfa
 * before it synchronises the profile, and the code form used to go straight
 * to its destination once Supabase accepted the code. A sign-in through the
 * challenge therefore never reached userRepository.upsertFromAuth: lastActiveAt
 * stayed where it was, and an account that signed in precisely to answer the
 * inactivity notice could still be erased for inactivity.
 *
 * The form calls this once the code is accepted. The session is read again
 * here, on the server, and goes through the same route as every other
 * sign-in: still short of its level, it is sent back to /mfa; at its level,
 * the profile is synchronised and the onboarding step, if any, comes first.
 */
export async function completeMfaSignIn(next: unknown): Promise<{ redirectTo: string }> {
  const requestedRoute = authRedirectSchema.safeParse(next).data ?? "/dashboard";
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { redirectTo: "/login" };

  try {
    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const redirectTo = await resolveUserPostSignInRoute(assurance, user, requestedRoute);
    return { redirectTo };
  } catch (profileError) {
    Sentry.captureException(profileError, { tags: { area: "auth.profile-sync" } });
    await supabase.auth.signOut({ scope: "local" });
    return { redirectTo: "/login?error=profile_sync_failed" };
  }
}
