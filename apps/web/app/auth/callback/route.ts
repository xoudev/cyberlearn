import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { authRedirectSchema } from "@cyberlearn/types";
import { createSupabaseServerClient } from "@cyberlearn/db/supabase/server";
import { resolveUserPostSignInRoute } from "@/lib/auth/password-flow";
import { checkAuthRateLimit } from "@/lib/rate-limit";

/** Exchanges Supabase PKCE codes from signup, recovery and legacy OAuth links. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedRoute =
    authRedirectSchema.safeParse(
      searchParams.get("next") ?? searchParams.get("redirectTo") ?? "/dashboard",
    ).data ?? "/dashboard";

  if (!(await checkAuthRateLimit(request))) {
    return NextResponse.redirect(new URL("/login?error=rate_limited", origin));
  }
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
    return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=no_user", origin));
  }

  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const redirectTo = await resolveUserPostSignInRoute(assurance, user, requestedRoute);
  return NextResponse.redirect(new URL(redirectTo, origin));
}
