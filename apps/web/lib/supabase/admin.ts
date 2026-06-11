import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Supabase admin client (service_role).
 * Use ONLY server-side for privileged operations - never expose to the client.
 * autoRefreshToken / persistSession disabled: this is a one-shot server call.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createSupabaseAdminClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
