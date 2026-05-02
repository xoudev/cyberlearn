import { prisma } from "@cyberlearn/db";
import { createSupabaseServerClient } from "@cyberlearn/db/supabase/server";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { checkAuthRateLimit } from "@/lib/rate-limit";

/**
 * Supabase Auth callback handler.
 *
 * Called after:
 * - Magic Link click (code in URL)
 * - GitHub OAuth redirect (code in URL)
 *
 * Flow:
 * 1. Exchange the auth code for a session
 * 2. Upsert the user row in public.users (first login creates the row)
 * 3. Check if onboarding is complete (username is set)
 * 4. Redirect accordingly
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  try {
    const cookieStore = await cookies();

    const allowed = await checkAuthRateLimit(request);
    if (!allowed) {
      return NextResponse.redirect(new URL("/login?error=rate_limited", origin));
    }

    if (!code) {
      return NextResponse.redirect(new URL("/login?error=missing_code", origin));
    }

    const supabase = createSupabaseServerClient({
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    });

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("[auth/callback] exchangeCodeForSession failed:", exchangeError.message);
      return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login?error=no_user", origin));
    }

    // ── Upsert user row in public.users ───────────────────────────────────────
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

    // ── Check onboarding status ───────────────────────────────────────────────
    const hasUsername = existingUser.username !== null;
    if (!hasUsername) {
      return NextResponse.redirect(new URL("/onboarding", origin));
    }

    const isOnboardingComplete = user.app_metadata.onboarding_complete === true;
    if (!isOnboardingComplete) {
      return NextResponse.redirect(new URL("/onboarding/avatar", origin));
    }

    const safeRedirect = isSafeRedirect(redirectTo) ? redirectTo : "/dashboard";
    return NextResponse.redirect(new URL(safeRedirect, origin));
  } catch (err) {
    console.error("[auth/callback] unhandled error:", err);
    return NextResponse.redirect(new URL("/login?error=server_error", origin));
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

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

/** Ensures the redirect target is a relative path (no open redirect). */
function isSafeRedirect(url: string): boolean {
  // Must start with / but not // (protocol-relative) or /\ (backslash bypass)
  return url.startsWith("/") && !url.startsWith("//") && !url.includes("\\");
}
