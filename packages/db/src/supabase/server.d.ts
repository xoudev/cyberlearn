import { type CookieMethodsServer } from "@supabase/ssr";
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
export declare function createSupabaseServerClient(
  cookieMethods: CookieMethodsServer,
): import("@supabase/supabase-js").SupabaseClient<any, "public", any, any, any>;
//# sourceMappingURL=server.d.ts.map
