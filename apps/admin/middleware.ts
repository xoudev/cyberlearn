import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import {
  isAccessDeniedPath,
  isMfaPath,
  isPublicPath,
  type LoginError,
  returnPathOf,
  withReturnPath,
} from "@/lib/auth-redirect";

export { isMfaPath, isPublicPath };

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
function originOfEnv(raw: string | undefined): string | null {
  if (raw === undefined || raw === "") return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/**
 * The learner site's origin. The console frames it (the lesson editor's
 * preview) and shows images it serves (the eight built-in avatars).
 */
function siteOrigin(): string | null {
  return originOfEnv(process.env.NEXT_PUBLIC_SITE_URL);
}

/**
 * The storage's origin, for the signed URLs of uploaded avatars and covers.
 * In production it is a *.supabase.co host, already allowed; the local stack
 * answers on http://127.0.0.1:54321, which the wildcard does not cover.
 */
function supabaseOrigin(): string | null {
  return originOfEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

function buildSecurityHeaders(nonce: string): Record<string, string> {
  const frameSrc = ["'self'", siteOrigin(), isVercelPreview ? "https://vercel.live" : null]
    .filter((origin): origin is string => origin !== null)
    .join(" ");
  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    "https://*.supabase.co",
    "https://avatars.githubusercontent.com",
    siteOrigin(),
    supabaseOrigin(),
  ]
    .filter(
      (origin, index, all): origin is string => origin !== null && all.indexOf(origin) === index,
    )
    .join(" ");
  return {
    "Content-Security-Policy": [
      "default-src 'self'",
      isDev
        ? `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net${vercelLive.script}`
        : `script-src 'nonce-${nonce}' 'strict-dynamic'${vercelLive.script}`,
      `style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net${vercelLive.style}`,
      `img-src ${imgSrc}${vercelLive.img}`,
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
 * True when the request carries a Supabase session cookie, split in chunks
 * (`sb-<ref>-auth-token.0`, `.1`) or not. Only decides whether a check is worth
 * a round trip; the session itself is still verified by Supabase.
 */
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
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

  if (pathname === "/robots.txt") return withSecurityHeaders(response, nonce);

  const redirectTo = (path: string): NextResponse =>
    withSecurityHeaders(NextResponse.redirect(new URL(path, request.url)), nonce);

  // The page that was asked for rides along to /login and /mfa, so that
  // signing in ends where the admin was going rather than on the dashboard.
  const returnPath = returnPathOf(request.nextUrl);
  const toLogin = (error?: LoginError): NextResponse => {
    const target = withReturnPath("/login", "redirectTo", returnPath);
    if (error === undefined) return redirectTo(target);
    return redirectTo(`${target}${target.includes("?") ? "&" : "?"}error=${error}`);
  };
  const toMfa = (path: "/mfa" | "/mfa/setup"): NextResponse =>
    redirectTo(withReturnPath(path, "next", returnPath));

  const isLogin = pathname === "/login";
  // Nobody signed in has a session to look at: the sign-in page renders
  // without a call to Supabase, and a stalled Supabase cannot slow it down.
  if (isLogin && !hasSessionCookie(request)) return withSecurityHeaders(response, nonce);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // No configuration means no way to verify anyone: closed, not open.
  if (!supabaseUrl || !supabaseAnonKey) {
    return isLogin ? withSecurityHeaders(response, nonce) : toLogin("auth_unavailable");
  }

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

  if (isLogin) {
    // A session that has passed the TOTP step has nothing to do on the
    // sign-in form: it goes where it was going. Anything short of that
    // (no session, a password without the code) still sees the form.
    if (user) {
      const assurance = await withTimeout(supabase.auth.mfa.getAuthenticatorAssuranceLevel());
      if (assurance && !assurance.error && assurance.data.currentLevel === "aal2") {
        return redirectTo(returnPath);
      }
    }
    return withSecurityHeaders(response, nonce);
  }

  if (!user) {
    // Say why, when it can be told: Supabase not answering is not the same
    // as a session that ran out, and both differ from a first visit. Not
    // answering is a timeout, or what supabase-js resolves a network failure
    // or a 5xx to: no user, with a retryable fetch error, rather than a throw.
    if (userResult === null || isAuthRetryableFetchError(userResult.error)) {
      return toLogin("auth_unavailable");
    }
    return toLogin(hasSessionCookie(request) ? "session_expired" : undefined);
  }

  // The access-denied screen takes any session: the account it is shown to
  // is not ADMIN, may have no factor at all, and sending it to enrol one
  // would only bring it back here.
  if (!isMfaPath(pathname) && !isAccessDeniedPath(pathname)) {
    const assurance = await withTimeout(supabase.auth.mfa.getAuthenticatorAssuranceLevel());
    if (!assurance || assurance.error) return toMfa("/mfa");
    if (assurance.data.currentLevel !== "aal2") {
      // No verified factor yet: the console requires one, so enrol first.
      return toMfa(assurance.data.nextLevel === "aal2" ? "/mfa" : "/mfa/setup");
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
