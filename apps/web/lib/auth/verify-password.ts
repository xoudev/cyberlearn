import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Checks a password without touching the caller's session.
 *
 * signInWithPassword on the request-bound client would rewrite the auth
 * cookies, and a fresh password sign-in is only AAL1 - so re-authenticating a
 * user who had already cleared their TOTP challenge would silently downgrade
 * their session. This throwaway client persists nothing.
 */
export async function verifyCurrentPassword(email: string, password: string): Promise<boolean> {
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  return error === null;
}
