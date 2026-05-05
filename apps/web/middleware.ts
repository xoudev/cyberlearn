import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// ─── Security headers (ADR-002) ────────────────────────────────────────────
// Nonce-based CSP: a random nonce is generated per request and forwarded via
// the x-nonce request header. Next.js reads x-nonce and stamps it onto its
// own inline hydration scripts automatically (v13.4.20+).

const isDev = process.env.NODE_ENV === "development";

function buildSecurityHeaders(nonce: string): Record<string, string> {
  return {
    "Content-Security-Policy": [
      "default-src 'self'",
      // Dev: unsafe-eval (HMR) + unsafe-inline; Prod: nonce + strict-dynamic
      // strict-dynamic allows scripts transitively loaded by nonce-trusted scripts
      // (Next.js chunk loading, Monaco dynamic imports, etc.)
      // cdn.jsdelivr.net kept as host fallback for browsers without strict-dynamic support
      isDev
        ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net"
        : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://cdn.jsdelivr.net`,
      // unsafe-inline required for Tailwind v4 JIT; cdn.jsdelivr.net for Monaco CSS
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
}

function applySecurityHeaders(response: NextResponse, nonce: string): void {
  const headers = buildSecurityHeaders(nonce);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
}

// ─── Route classification ──────────────────────────────────────────────────

function isDevRoute(pathname: string): boolean {
  return pathname.startsWith("/dev");
}

function isPublicRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/") ||
    pathname === "/verify" ||
    pathname.startsWith("/verify/") ||
    pathname === "/auth/confirm" ||
    pathname.startsWith("/u/") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/legal/") ||
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

  // Generate a fresh nonce for every request — used in CSP and forwarded to
  // server components via x-nonce so Next.js stamps it on inline scripts.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Build request headers that include the nonce so layout.tsx can read it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  // Block /dev/* in production — return 404, not 403 (don't reveal route existence)
  if (isDevRoute(pathname) && process.env.NODE_ENV === "production") {
    const notFound = new NextResponse(null, { status: 404 });
    applySecurityHeaders(notFound, nonce);
    return notFound;
  }

  // Default response — forwards our custom headers (including x-nonce) downstream
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars aren't set yet (local dev without .env.local), skip auth checks
  if (!supabaseUrl || !supabaseAnonKey) {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    applySecurityHeaders(res, nonce);
    return res;
  }

  // Create Supabase client — MUST use this cookie pattern for SSR session refresh.
  // Explicit CookieMethodsServer type needed to avoid implicit-any on setAll params.
  const cookieMethods: CookieMethodsServer = {
    getAll: () => request.cookies.getAll(),
    setAll: (cookiesToSet) => {
      // Refresh cookies on the request object so subsequent server reads see the new session
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      // Rebuild the cookie header from updated cookies so x-nonce is still forwarded
      const refreshedCookieHeader = request.cookies
        .getAll()
        .map(({ name, value }) => `${name}=${value}`)
        .join("; ");
      requestHeaders.set("cookie", refreshedCookieHeader);
      response = NextResponse.next({ request: { headers: requestHeaders } });
      // Set cookies on the response so the browser receives the refreshed session
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
      applySecurityHeaders(redirectResponse, nonce);
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
      applySecurityHeaders(redirectResponse, nonce);
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
      applySecurityHeaders(redirectResponse, nonce);
      return redirectResponse;
    }
  }

  applySecurityHeaders(response, nonce);
  return response;
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
