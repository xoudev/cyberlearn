import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export interface BearerUser {
  id: string;
  email: string | null;
}

/**
 * Authenticate a mobile API request from its `Authorization: Bearer <jwt>`
 * header. The token is the user's Supabase access token; getUser(token)
 * verifies it against Supabase Auth (signature + expiry + revocation), so a
 * forged or stale token yields null. Cookie-less by design: mobile clients
 * have no session cookies, hence plain supabase-js instead of @supabase/ssr.
 */
export async function userFromBearer(request: Request): Promise<BearerUser | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return { id: user.id, email: user.email ?? null };
}
