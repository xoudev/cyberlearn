import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { banRepository, prisma, type BanView } from "@cyberlearn/db";

/**
 * Single `supabase.auth.getUser()` call per server request, deduplicated via
 * React.cache. Previously Navbar, AppSidebar, and every page each made their
 * own call - 3+ round-trips to the Supabase auth server per page load.
 */
export const getRequestUser = cache(async () => {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
});

/**
 * The ban in force on the signed-in account, or null.
 *
 * Cached for the request, like the session read above: a page that calls
 * requireRequestUser from three components asks the database once.
 *
 * It is a query rather than a claim on the token because a ban has to bite
 * now. A flag in the session would be as stale as the session - up to an hour
 * on a refresh cycle - which is an hour of somebody carrying on after the
 * decision to stop them.
 */
export const getActiveBan = cache(async (): Promise<BanView | null> => {
  const user = await getRequestUser();
  if (!user) return null;
  return banRepository.findActive(user.id);
});

/**
 * Redirects to /login if unauthenticated, and to /banned if banned.
 *
 * The ban check lives here rather than in the middleware for two reasons. The
 * middleware runs on the edge, where Prisma does not, so the only thing it
 * could read is a claim on the session - and a claim is stale. And every server
 * action that does anything on somebody's behalf already calls this, so the
 * gate covers the actions as well as the pages: a banned account cannot post by
 * calling an action directly any more than by opening a page.
 *
 * /banned and the appeal do not call this - they would bounce off it - and use
 * getRequestUser with their own lookup instead.
 */
export async function requireRequestUser(): Promise<User> {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  if (await getActiveBan()) redirect("/banned");
  return user;
}

/**
 * Shared DB user profile - covers every field needed by Navbar + AppSidebar.
 * React.cache ensures only one Prisma query per request, regardless of how
 * many layout components call this.
 */
export const getSharedUserProfile = cache(async () => {
  const user = await getRequestUser();
  if (!user) return null;
  return prisma.user.findUnique({
    where: { id: user.id },
    // role rides along on the query the sidebar already makes, so showing a
    // teacher their classes costs no extra round trip - and reads the database
    // rather than the session claim, so a removed role disappears at once.
    select: { xpTotal: true, displayName: true, avatarUrl: true, role: true },
  });
});
