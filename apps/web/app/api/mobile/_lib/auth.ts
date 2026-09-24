import { createClient } from "@supabase/supabase-js";
import { banRepository } from "@cyberlearn/db";
import { env } from "@/lib/env";
import { sessionMeetsMfaRequirement } from "./bearer-token";

export interface BearerUser {
  id: string;
  email: string | null;
}

/**
 * Who is behind a mobile API request's `Authorization: Bearer <jwt>` header,
 * banned or not. The token is the user's Supabase access token;
 * getUser(token) verifies it against Supabase Auth (signature + expiry +
 * revocation), so a forged or stale token yields null. Cookie-less by design:
 * mobile clients have no session cookies, hence plain supabase-js instead of
 * @supabase/ssr.
 *
 * Only for what a banned account may still do (read its ban, close the notice,
 * appeal), like the site's /banned page and its actions, which use
 * getRequestUser. Everything else goes through userFromBearer.
 */
export async function identityFromBearer(request: Request): Promise<BearerUser | null> {
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
  if (!sessionMeetsMfaRequirement(token, user.factors)) return null;
  return { id: user.id, email: user.email ?? null };
}

/**
 * The account behind a mobile API request, when it may act: null for no valid
 * token, and null for a banned account.
 *
 * The ban check is the one requireRequestUser makes on the site. Without it a
 * banned account kept earning XP, rating and reporting from the app. It lives
 * here, in the one function every route already calls, so a route cannot be
 * written without it. It is a query rather than a token claim for the site's
 * reason: a ban has to bite now, not at the next refresh.
 */
export async function userFromBearer(request: Request): Promise<BearerUser | null> {
  const user = await identityFromBearer(request);
  if (!user) return null;
  if (await banRepository.findActive(user.id)) return null;
  return user;
}
