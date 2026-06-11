import { createSupabaseServerClient } from "@cyberlearn/db/supabase/server";
import { cookies } from "next/headers";
import type { CookieOptions } from "@supabase/ssr";

/**
 * Returns a Supabase server client wired to the current request's cookies.
 * Call this inside Server Components, Server Actions, or Route Handlers.
 *
 * Usage:
 * ```ts
 * const supabase = await getSupabaseServerClient();
 * const { data: { user } } = await supabase.auth.getUser();
 * ```
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: (toSet: { name: string; value: string; options: CookieOptions }[]) => {
      toSet.forEach(({ name, value, options }) => {
        // cookies() is read-only in Server Components - writes are no-ops there.
        // In Server Actions and Route Handlers, cookies() is writable.
        try {
          cookieStore.set(name, value, options);
        } catch {
          // Silently ignore - called from a Server Component context
        }
      });
    },
  });
}
