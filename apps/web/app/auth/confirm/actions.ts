"use server";

import { headers } from "next/headers";
import { cookies } from "next/headers";
import { prisma } from "@cyberlearn/db";
import { createSupabaseServerClient } from "@cyberlearn/db/supabase/server";
import { checkAuthRateLimit } from "@/lib/rate-limit";

export async function finalizeAuthCallback(): Promise<{
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

    if (user.email) {
      await prisma.user.deleteMany({
        where: { email: user.email, id: { not: user.id } },
      });
    }

    const existingUser = await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email ?? "",
        displayName: extractDisplayName(user),
        avatarUrl: extractAvatarUrl(user),
      },
      update: {
        lastActiveAt: new Date(),
        avatarUrl: extractAvatarUrl(user),
      },
    });

    const hasUsername = existingUser.username !== null;
    if (!hasUsername) {
      return { error: null, redirectTo: "/onboarding" };
    }

    const isOnboardingComplete = user.app_metadata.onboarding_complete === true;
    if (!isOnboardingComplete) {
      return { error: null, redirectTo: "/onboarding/avatar" };
    }

    return { error: null, redirectTo: "/dashboard" };
  } catch (err) {
    console.error("[auth/confirm] finalizeAuthCallback error:", err);
    return { error: null, redirectTo: "/login?error=server_error" };
  }
}

function extractDisplayName(user: { user_metadata?: Record<string, unknown> }): string {
  const meta = user.user_metadata ?? {};
  return (
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    (meta.user_name as string | undefined) ??
    ""
  );
}

function extractAvatarUrl(user: { user_metadata?: Record<string, unknown> }): string | null {
  const meta = user.user_metadata ?? {};
  return (meta.avatar_url as string | undefined) ?? (meta.picture as string | undefined) ?? null;
}
