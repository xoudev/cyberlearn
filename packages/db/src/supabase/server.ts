import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in Server Components, Server Actions,
 * and Route Handlers. Requires a cookie adapter from the calling context.
 *
 * Usage in a Server Component / Server Action:
 * ```ts
 * import { cookies } from "next/headers";
 * import { createSupabaseServerClient } from "@cyberlearn/db/supabase/server";
 *
 * const cookieStore = await cookies();
 * const supabase = createSupabaseServerClient({
 *   getAll: () => cookieStore.getAll(),
 *   setAll: (toSet) =>
 *     toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
 * });
 * ```
 *
 * IMPORTANT: Do NOT use process.env directly here — env vars are validated
 * in apps/web/lib/env.ts and apps/admin/lib/env.ts at startup.
 */
export function createSupabaseServerClient(cookieMethods: CookieMethodsServer) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Ensure your .env.local is configured and env validation passed.",
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-deprecated
  return createServerClient(supabaseUrl, supabaseAnonKey, { cookies: cookieMethods });
}
