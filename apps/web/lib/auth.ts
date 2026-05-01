import { cache } from "react";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@cyberlearn/db";

/**
 * Single `supabase.auth.getUser()` call per server request, deduplicated via
 * React.cache. Previously Navbar, AppSidebar, and every page each made their
 * own call — 3+ round-trips to the Supabase auth server per page load.
 */
export const getRequestUser = cache(async () => {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
});

/** Redirects to /login if unauthenticated. Drop-in replacement for requireUser(supabase). */
export async function requireRequestUser() {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Shared DB user profile — covers every field needed by Navbar + AppSidebar.
 * React.cache ensures only one Prisma query per request, regardless of how
 * many layout components call this.
 */
export const getSharedUserProfile = cache(async () => {
  const user = await getRequestUser();
  if (!user) return null;
  return prisma.user.findUnique({
    where: { id: user.id },
    select: { xpTotal: true, displayName: true, avatarUrl: true },
  });
});
