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
export declare function createSupabaseAdminClient(): import("@supabase/supabase-js").SupabaseClient<
  any,
  "public",
  "public",
  any,
  any
>;
//# sourceMappingURL=admin.d.ts.map
