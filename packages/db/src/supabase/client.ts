import { createBrowserClient } from "@supabase/ssr";

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
export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
