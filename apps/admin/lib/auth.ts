import { notFound, redirect } from "next/navigation";
import { prisma } from "@cyberlearn/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Auth guard for admin Server Actions.
 *
 * In production the Supabase Auth Hook injects `user_role` into the JWT, so
 * the role is read from app_metadata without hitting the DB.
 * In dev the hook may not be running, so we fall back to a direct DB lookup —
 * the same pattern used in the (admin) layout.
 *
 * Returns 404 (not 403) to avoid revealing the route to non-admins.
 */
export async function requireAdminAction(): Promise<{
  id: string;
  email: string | undefined;
  role: "ADMIN";
}> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const jwtRole = user.app_metadata.user_role as string | undefined;
  let role: string | undefined = jwtRole;

  if (!role) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    role = dbUser?.role ?? undefined;
  }

  if (role !== "ADMIN") notFound();

  return { id: user.id, email: user.email, role: "ADMIN" };
}
