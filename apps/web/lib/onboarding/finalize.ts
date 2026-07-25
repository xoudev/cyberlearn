import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@cyberlearn/db/supabase/admin";

/**
 * Flags onboarding as complete for `userId` and re-mints the caller's session.
 *
 * This writes to Supabase Auth with the service-role key on a caller-supplied
 * userId, so it must never be reachable from the client: it lives in a plain
 * module rather than a "use server" file, where every export becomes a callable
 * endpoint. Callers are responsible for passing a session-derived id.
 *
 * app_metadata is embedded in the access-token JWT, and updateUserById does
 * NOT refresh the caller's token. The middleware reads onboarding_complete
 * from that JWT, so without an explicit refresh it keeps seeing the stale
 * value and bounces the user back into onboarding (the "stuck on avatar"
 * bug after finishing or skipping the placement test). Refreshing the session
 * here re-mints the token with the new flag and writes the updated auth
 * cookies. This must run in a Server Action / Route Handler context (where
 * cookies are writable), which is the case for both callers.
 */
export async function setOnboardingComplete(userId: string): Promise<void> {
  const adminClient = createSupabaseAdminClient();
  await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: { onboarding_complete: true },
  });

  const supabase = await getSupabaseServerClient();
  await supabase.auth.refreshSession();
}
