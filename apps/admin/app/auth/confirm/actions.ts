"use server";

import { headers } from "next/headers";
import { cookies } from "next/headers";
import { prisma } from "@cyberlearn/db";
import { createSupabaseServerClient } from "@cyberlearn/db/supabase/server";
import { checkAuthRateLimit } from "@/lib/rate-limit";

export async function finalizeAdminAuthCallback(): Promise<{
  error: string | null;
  redirectTo: string;
}> {
  try {
    const headerStore = await headers();
    const allowed = await checkAuthRateLimit({ headers: headerStore });
    if (!allowed) {
      return { error: null, redirectTo: "/login?error=rate_limited" };
    }

    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient({
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: null, redirectTo: "/login?error=no_user" };
    }

    // JWT role (injected by Supabase Auth Hook in production).
    // Falls back to DB lookup when the hook is not yet configured.
    const jwtRole = user.app_metadata.user_role as string | undefined;
    let role: string | undefined = jwtRole;

    if (!role) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true },
      });
      role = dbUser?.role ?? undefined;
    }

    if (role !== "ADMIN") {
      await supabase.auth.signOut();
      return { error: "Accès refusé : rôle ADMIN requis.", redirectTo: "/login" };
    }

    return { error: null, redirectTo: "/dashboard" };
  } catch (err) {
    console.error("[admin/auth/confirm] finalizeAdminAuthCallback error:", err);
    return { error: null, redirectTo: "/login?error=server_error" };
  }
}
