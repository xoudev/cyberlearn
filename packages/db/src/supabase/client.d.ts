/**
 * Creates a Supabase client for use in Client Components ("use client").
 * Safe to call multiple times — the SDK handles deduplication internally.
 *
 * Usage:
 * ```ts
 * "use client";
 * import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";
 *
 * const supabase = createSupabaseBrowserClient();
 * ```
 */
export declare function createSupabaseBrowserClient(): import(
  "@supabase/supabase-js",
).SupabaseClient<any, "public", any, any, any>;
//# sourceMappingURL=client.d.ts.map
