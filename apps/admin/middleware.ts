import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const isDev = process.env.NODE_ENV === "development";

// Vercel injects its Live toolbar (feedback + comments) into preview
// deployments; it loads scripts, an iframe and websockets from vercel.live.
// Allow those sources on previews only - production keeps the strict policy.
const isVercelPreview = process.env.VERCEL_ENV === "preview";
const vercelLive = {
  script: isVercelPreview ? " https://vercel.live" : "",
  style: isVercelPreview ? " https://vercel.live" : "",
  img: isVercelPreview ? " https://vercel.live https://vercel.com" : "",
  font: isVercelPreview ? " https://vercel.live https://assets.vercel.com" : "",
  connect: isVercelPreview ? " https://vercel.live wss://*.pusher.com" : "",
};

/**
 * The site's policy, nonce-based. The console used to allow 'unsafe-inline'
 * and 'unsafe-eval' for Monaco, which made any injected script run in the one
 * place where a script can do the most. It never needed them: the site runs
 * the same editor (the teacher's) under this policy, the loader and its
 * modules being let in by 'strict-dynamic' from the nonce-trusted chunks.
 */
/** The learner site's origin, the one thing the console frames: the lesson editor's preview. */
function siteOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (raw === undefined || raw === "") return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function buildSecurityHeaders(nonce: string): Record<string, string> {
  const frameSrc = ["'self'", siteOrigin(), isVercelPreview ? "https://vercel.live" : null]
    .filter((origin): origin is string => origin !== null)
    .join(" ");
  return {
    "Content-Security-Policy": [
      "default-src 'self'",
      isDev
        ? `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net${vercelLive.script}`
        : `script-src 'nonce-${nonce}' 'strict-dynamic'${vercelLive.script}`,
      `style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net${vercelLive.style}`,
      `img-src 'self' data: blob: https://*.supabase.co https://avatars.githubusercontent.com${vercelLive.img}`,
      `font-src 'self' data:${vercelLive.font}`,
      isDev
        ? `connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://localhost:* http://localhost:* https://cdn.jsdelivr.net https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.ingest.us.sentry.io${vercelLive.connect}`
        : `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.ingest.us.sentry.io${vercelLive.connect}`,
      `frame-src ${frameSrc}`,
      "worker-src 'self' blob:",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      ...(isDev ? [] : ["upgrade-insecure-requests"]),
      ...(process.env.NEXT_PUBLIC_SENTRY_CSP_REPORT_URI
        ? [`report-uri ${process.env.NEXT_PUBLIC_SENTRY_CSP_REPORT_URI}`]
        : []),
    ].join("; "),
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
    // Nothing the console serves is meant to be kept by a proxy or the back
    // button once the session is gone.
    "Cache-Control": "private, no-store",
  };
}

function withSecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  for (const [key, value] of Object.entries(buildSecurityHeaders(nonce))) {
    response.headers.set(key, value);
  }
  return response;
}

/** Reachable without a session: the sign-in page and what crawlers read. */
export function isPublicPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/robots.txt";
}

/** Reachable with a session that has not passed the TOTP step yet. */
export function isMfaPath(pathname: string): boolean {
  return pathname === "/mfa" || pathname.startsWith("/mfa/");
}

// A stalled Supabase must not hold the console open, nor hang it: past this
// the request is treated as unauthenticated.
const AUTH_TIMEOUT_MS = 4000;

async function withTimeout<T>(promise: Promise<T>): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      resolve(null);
    }, AUTH_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The console's front door. Until now it only set headers and left every
 * check to the (admin) layout - which a crafted client-navigation request can
 * skip, since the router renders only the segments the request says are
 * missing. An anonymous request had /users run its user query that way. The
 * layout and every page still check the ADMIN role against the database
 * (requireAdminPage); this makes sure nothing past /login even starts without
 * a session Supabase has verified and, past /mfa, the TOTP step.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const nonce = btoa(crypto.randomUUID());
  const { pathname } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  if (isPublicPath(pathname)) return withSecurityHeaders(response, nonce);

  const redirectTo = (path: string): NextResponse =>
    withSecurityHeaders(NextResponse.redirect(new URL(path, request.url)), nonce);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // No configuration means no way to verify anyone: closed, not open.
  if (!supabaseUrl || !supabaseAnonKey) return redirectTo("/login");

  const cookieMethods: CookieMethodsServer = {
    getAll: () => request.cookies.getAll(),
    setAll: (cookiesToSet) => {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      requestHeaders.set(
        "cookie",
        request.cookies
          .getAll()
          .map(({ name, value }) => `${name}=${value}`)
          .join("; "),
      );
      response = NextResponse.next({ request: { headers: requestHeaders } });
      cookiesToSet.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options),
      );
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- same createServerClient overload as apps/web/middleware.ts.
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, { cookies: cookieMethods });

  // getUser, not getSession: getSession trusts the cookie as it comes, and a
  // cookie is something the requester writes.
  const userResult = await withTimeout(supabase.auth.getUser());
  const user = userResult?.data.user ?? null;
  if (!user) return redirectTo("/login");

  if (!isMfaPath(pathname)) {
    const assurance = await withTimeout(supabase.auth.mfa.getAuthenticatorAssuranceLevel());
    if (!assurance || assurance.error) return redirectTo("/mfa");
    if (assurance.data.currentLevel !== "aal2") {
      // No verified factor yet: the console requires one, so enrol first.
      return redirectTo(assurance.data.nextLevel === "aal2" ? "/mfa" : "/mfa/setup");
    }
  }

  return withSecurityHeaders(response, nonce);
}

export const config = {
  matcher: [
    // Static files are exempt: the sign-in page shows the logo before anyone
    // has a session. Everything else, pages and their RSC payloads alike,
    // goes through the door.
    "/((?!_next/static|_next/image|favicon.ico|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
