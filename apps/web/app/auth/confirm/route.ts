import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import type { EmailOtpType } from "@supabase/supabase-js";
import { authRedirectSchema } from "@cyberlearn/types";
import { createSupabaseServerClient } from "@cyberlearn/db/supabase/server";
import { resolveUserPostSignInRoute } from "@/lib/auth/password-flow";
import { checkAuthRateLimit } from "@/lib/rate-limit";

const EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
]);

function parseOtpType(value: string | null): EmailOtpType | null {
  // SAFETY: the first cast only feeds the Set membership test; the value is
  // returned as EmailOtpType exactly when the Set proves it is one of the
  // literals, so the narrowing cast cannot mislabel the string.
  return value !== null && EMAIL_OTP_TYPES.has(value as EmailOtpType)
    ? (value as EmailOtpType)
    : null;
}

/**
 * Verifies Supabase email OTP tokens (signup, recovery, magic link, ...) carried
 * by the custom Resend email hook. The link ships `token_hash` + `type`, which we
 * exchange for a session server-side via `verifyOtp` - no PKCE `code_verifier`
 * and no URL fragment involved, so it works even when the link is opened in a
 * different browser or device (e.g. a reset requested from the mobile app that
 * lands on the web). Recovery sessions are routed straight to the reset form;
 * the reset page and the `updatePassword` action re-check the session and MFA.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = parseOtpType(searchParams.get("type"));
  const requestedRoute =
    authRedirectSchema.safeParse(searchParams.get("next") ?? "/dashboard").data ?? "/dashboard";

  if (!(await checkAuthRateLimit(request))) {
    return NextResponse.redirect(new URL("/login?error=rate_limited", origin));
  }
  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/login?error=missing_token", origin));
  }

  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: (toSet) => {
      toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
    },
  });

  const { error: verifyError } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (verifyError) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=no_user", origin));
  }

  // Password recovery always lands on the reset form regardless of onboarding
  // state - the recovery session only unlocks a single password update.
  if (type === "recovery") {
    return NextResponse.redirect(new URL("/reset-password", origin));
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
