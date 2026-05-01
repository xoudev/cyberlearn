import { prisma } from "@cyberlearn/db";
import { createSupabaseServerClient } from "@cyberlearn/db/supabase/server";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

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
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const cookieStore = await cookies();

  if (!code) {
    // Missing code — redirect to login with an error
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
    return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=no_user", origin));
  }

  // ── Upsert user row in public.users ───────────────────────────────────────
  // On first login, creates the row. On subsequent logins, updates lastActiveAt.
  // username is left null until onboarding is complete.

  // Purge any orphaned row with the same email but a different id — this can
  // happen when a Supabase Auth user is manually deleted and recreated, which
  // generates a new UUID while leaving the old public.users row behind.
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
      // username is deliberately null until onboarding step
    },
    update: {
      lastActiveAt: new Date(),
      // Update avatar from OAuth provider if it changed (null clears the field)
      avatarUrl: extractAvatarUrl(user),
    },
  });

  // ── Check onboarding status ───────────────────────────────────────────────
  // Step 1 (identity): username must be set
  const hasUsername = existingUser.username !== null;
  if (!hasUsername) {
    return NextResponse.redirect(new URL("/onboarding", origin));
  }

  // Step 2–3 (avatar + placement): check app_metadata flag set at the end of step 3
  const isOnboardingComplete = user.app_metadata?.["onboarding_complete"] === true;
  if (!isOnboardingComplete) {
    return NextResponse.redirect(new URL("/onboarding/avatar", origin));
  }

  // Sanitize the redirect target — only allow relative paths on the same origin
  const safeRedirect = isSafeRedirect(redirectTo, origin) ? redirectTo : "/dashboard";

  return NextResponse.redirect(new URL(safeRedirect, origin));
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function extractDisplayName(user: { user_metadata?: Record<string, unknown> }): string {
  const meta = user.user_metadata ?? {};
  return (
    (meta["full_name"] as string | undefined) ??
    (meta["name"] as string | undefined) ??
    (meta["user_name"] as string | undefined) ??
    ""
  );
}

function extractAvatarUrl(user: { user_metadata?: Record<string, unknown> }): string | null {
  const meta = user.user_metadata ?? {};
  return (
    (meta["avatar_url"] as string | undefined) ?? (meta["picture"] as string | undefined) ?? null
  );
}

/** Ensures the redirect target is a relative path (no open redirect). */
function isSafeRedirect(url: string, _origin: string): boolean {
  // Must be a relative path starting with /
  return url.startsWith("/") && !url.startsWith("//");
}
