import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase admin client using the service role key.
 *
 * CRITICAL SECURITY NOTE:
 * - This client bypasses ALL Row Level Security policies
 * - Must ONLY be used in Server Actions or Route Handlers (never in Client Components)
 * - The SUPABASE_SERVICE_ROLE_KEY must NEVER be exposed to the browser
 *
 * Usage:
 * ```ts
 * // In a Server Action or Route Handler only
 * import { createSupabaseAdminClient } from "@cyberlearn/db/supabase/admin";
 *
 * const adminClient = createSupabaseAdminClient();
 * ```
 */
export function createSupabaseAdminClient() {
  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "This client must only be used server-side.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
