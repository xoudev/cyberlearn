import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// ─── Security headers (ADR-002) ────────────────────────────────────────────
// Implemented directly instead of using the unmaintained next-safe-middleware.
// Update the CSP when adding new external origins (Pyodide CDN in Phase 4, etc.).

const isDev = process.env.NODE_ENV === "development";

// In dev, Next.js HMR requires 'unsafe-eval' and injects inline scripts.
// In prod, keep strict — no eval, no inline.
const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": [
    "default-src 'self'",
    // Dev: unsafe-eval for HMR + Monaco; Prod: wasm-unsafe-eval for Pyodide + Monaco CDN
    isDev
      ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net"
      : "script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net",
    // unsafe-inline required for Tailwind v4; cdn.jsdelivr.net for Monaco CSS
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "img-src 'self' data: https://*.supabase.co https://avatars.githubusercontent.com",
    "font-src 'self' data:",
    // blob: for Monaco worker creation; cdn.jsdelivr.net for Pyodide + Monaco loader
    isDev
      ? "connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://localhost:* http://localhost:* https://cdn.jsdelivr.net"
      : "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net",
    // blob: required for Monaco editor web workers and Pyodide blob worker
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; "),
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

// ─── Route classification ──────────────────────────────────────────────────

function isDevRoute(pathname: string): boolean {
  return pathname.startsWith("/dev");
}

function isPublicRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/verify/") ||
    pathname.startsWith("/u/") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon")
  );
}

function isOnboardingRoute(pathname: string): boolean {
  return pathname.startsWith("/onboarding");
}

// ─── Middleware ────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Block /dev/* in production — return 404, not 403 (don't reveal the route exists)
  if (isDevRoute(pathname) && process.env.NODE_ENV === "production") {
    const notFound = new NextResponse(null, { status: 404 });
    applySecurityHeaders(notFound);
    return notFound;
  }

  // Always apply security headers
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars aren't set yet (local dev without .env.local), skip auth checks
  if (!supabaseUrl || !supabaseAnonKey) {
    const res = NextResponse.next({ request });
    applySecurityHeaders(res);
    return res;
  }

  // Create Supabase client — MUST use this cookie pattern for SSR session refresh
  // Explicit CookieMethodsServer type needed to avoid implicit-any on setAll params.
  const cookieMethods: CookieMethodsServer = {
    getAll: () => request.cookies.getAll(),
    setAll: (cookiesToSet) => {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      cookiesToSet.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options),
      );
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: cookieMethods,
  });

  // IMPORTANT: Do NOT add any logic between createServerClient and getUser().
  // The session refresh mutates cookies and must propagate to the response.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Routing logic ──────────────────────────────────────────────────────

  if (!user) {
    // Unauthenticated user trying to access a protected route
    if (!isPublicRoute(pathname)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      applySecurityHeaders(redirectResponse);
      return redirectResponse;
    }
  } else {
    // Authenticated user — check onboarding completion
    // We use app_metadata.onboarding_complete set by the callback route
    // to avoid a DB query on every request.
    const isOnboardingComplete = user.app_metadata.onboarding_complete === true;

    if (!isOnboardingComplete && !isOnboardingRoute(pathname) && !isPublicRoute(pathname)) {
      const onboardingUrl = new URL("/onboarding", request.url);
      const redirectResponse = NextResponse.redirect(onboardingUrl);
      applySecurityHeaders(redirectResponse);
      return redirectResponse;
    }

    // Completed-onboarding user visiting /login or /onboarding → redirect to dashboard
    // Exception: result page is shown once right after completing the placement test
    const isPlacementResult = pathname === "/onboarding/placement-test/result";
    if (
      isOnboardingComplete &&
      (pathname === "/login" || isOnboardingRoute(pathname)) &&
      !isPlacementResult
    ) {
      const dashboardUrl = new URL("/dashboard", request.url);
      const redirectResponse = NextResponse.redirect(dashboardUrl);
      applySecurityHeaders(redirectResponse);
      return redirectResponse;
    }
  }

  applySecurityHeaders(response);
  return response;
}

function applySecurityHeaders(response: NextResponse): void {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
