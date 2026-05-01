import { createSupabaseServerClient } from "@cyberlearn/db/supabase/server";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { checkAuthRateLimit } from "@/lib/rate-limit";

/**
 * Admin Supabase Auth callback.
 *
 * After Magic Link or GitHub OAuth, exchanges the code for a session,
 * then verifies the user has the ADMIN role (injected into app_metadata
 * by the Supabase Auth Hook). Non-admin users are rejected.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
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
    return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=no_user", origin));
  }

  const role = user.app_metadata.user_role as string | undefined;

  if (role !== "ADMIN") {
    // Sign out the non-admin user to avoid leaving a dangling session
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=not_admin", origin));
  }

  return NextResponse.redirect(new URL("/dashboard", origin));
}
