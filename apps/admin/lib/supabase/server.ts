import { createSupabaseServerClient } from "@cyberlearn/db/supabase/server";
import { cookies } from "next/headers";
import type { CookieOptions } from "@supabase/ssr";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: (toSet: { name: string; value: string; options: CookieOptions }[]) => {
      toSet.forEach(({ name, value, options }) => {
        try {
          cookieStore.set(name, value, options);
        } catch {
          /* no-op in RSC */
        }
      });
    },
  });
}
