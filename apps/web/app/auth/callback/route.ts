import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { authRedirectSchema } from "@cyberlearn/types";
import { createSupabaseServerClient } from "@cyberlearn/db/supabase/server";
import { resolveUserPostSignInRoute } from "@/lib/auth/password-flow";

/** Exchanges Supabase PKCE codes from signup, recovery and GitHub OAuth links. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedRoute =
    authRedirectSchema.safeParse(
      searchParams.get("next") ?? searchParams.get("redirectTo") ?? "/dashboard",
    ).data ?? "/dashboard";

  // No rate limit here: the code is single-use and bound to the browser's PKCE
  // verifier, while a per-IP budget made a class signing in with GitHub from
  // the school's one address lock each other out.
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", origin));
  }

  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: (toSet) => {
      toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
    },
  });

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    // A reset link that went through here is not a sign-in link either.
    const failure = requestedRoute === "/reset-password" ? "recovery_expired" : "auth_failed";
    return NextResponse.redirect(new URL(`/login?error=${failure}`, origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=no_user", origin));
  }

  try {
    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const redirectTo = await resolveUserPostSignInRoute(assurance, user, requestedRoute);
    return NextResponse.redirect(new URL(redirectTo, origin));
  } catch (profileError) {
    Sentry.captureException(profileError, { tags: { area: "auth.profile-sync" } });
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.redirect(new URL("/login?error=profile_sync_failed", origin));
  }
}
