import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { isAuthApiError, isAuthSessionMissingError } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { isProtectedRoute } from "@/lib/routes";
import { REQUEST_ID_HEADER, requestIdFor } from "@/lib/request-id";

// ─── Security headers (ADR-002) ────────────────────────────────────────────
// Nonce-based CSP: a random nonce is generated per request and forwarded via
// the x-nonce request header. Next.js reads x-nonce and stamps it onto its
// own inline hydration scripts automatically (v13.4.20+).

const isDev = process.env.NODE_ENV === "development";

// Vercel injects its Live toolbar (feedback + comments) into preview
// deployments; it loads scripts, an iframe and websockets from vercel.live.
// Allow those sources on previews only - production keeps the strict policy.
const isVercelPreview = process.env.VERCEL_ENV === "preview";

/**
 * The lesson editor's preview: the site renders a draft, and the editor (the
 * console's, or a teacher's on this site) shows the page in an iframe. It is
 * the one route that may be framed, and only by this origin and the console's.
 * The token in its address is its credential; see lesson-preview.repository.ts.
 */
export function isPreviewRoute(pathname: string): boolean {
  return pathname.startsWith("/preview/");
}

/** localhost, *.localhost and the loopback addresses: where a developer's apps run. */
function isLoopback(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

function parseUrl(raw: string | undefined): URL | null {
  if (raw === undefined || raw === "") return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

/**
 * The console's origin, the one other origin allowed to frame the preview.
 *
 * NEXT_PUBLIC_ADMIN_URL names it. Without it, the console is taken to be at
 * `admin.` in front of the site's host, which is where it is deployed. A
 * loopback address in the variable is the development default: it names the
 * console of a site that runs on loopback too, and of no other, so a site on
 * a public host ignores it and falls back the same way. The production site
 * once answered `frame-ancestors 'self' http://localhost:3001`, the value
 * copied off .env.example into the deployment, and the console's editor
 * showed the browser's refusal in place of the preview.
 */
export function consoleOrigin(
  adminUrl: string | undefined,
  siteUrl: string | undefined,
): string | null {
  const admin = parseUrl(adminUrl);
  const site = parseUrl(siteUrl);
  if (site === null || isLoopback(site.hostname)) return admin?.origin ?? null;
  if (admin !== null && !isLoopback(admin.hostname)) return admin.origin;
  return `${site.protocol}//admin.${site.host}`;
}

function buildSecurityHeaders(nonce: string, pathname: string): Record<string, string> {
  const framable = isPreviewRoute(pathname);
  const admin = consoleOrigin(process.env.NEXT_PUBLIC_ADMIN_URL, process.env.NEXT_PUBLIC_SITE_URL);
  const frameAncestors = framable
    ? `frame-ancestors 'self'${admin === null ? "" : ` ${admin}`}`
    : "frame-ancestors 'none'";

  const vercelLive = {
    script: isVercelPreview ? " https://vercel.live" : "",
    style: isVercelPreview ? " https://vercel.live" : "",
    img: isVercelPreview ? " https://vercel.live https://vercel.com" : "",
    font: isVercelPreview ? " https://vercel.live https://assets.vercel.com" : "",
    connect: isVercelPreview ? " https://vercel.live wss://*.pusher.com" : "",
  };

  return {
    "Content-Security-Policy": [
      "default-src 'self'",
      // Dev: unsafe-eval (HMR) + unsafe-inline; Prod: nonce + strict-dynamic
      // strict-dynamic allows scripts transitively loaded by nonce-trusted scripts
      // (Next.js chunk loading, Monaco dynamic imports, etc.)
      // 'wasm-unsafe-eval' required for Pyodide WebAssembly compilation
      // (cdn.jsdelivr.net Monaco loader + local /runtimes/pyodide/* WASM).
      isDev
        ? `script-src 'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net${vercelLive.script}`
        : `script-src 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${vercelLive.script}`,
      // unsafe-inline required for Tailwind v4 JIT; cdn.jsdelivr.net for Monaco CSS
      `style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net${vercelLive.style}`,
      // blob: for the in-browser avatar cropper preview (URL.createObjectURL of
      // the selected file before it is uploaded).
      `img-src 'self' data: blob: https://*.supabase.co https://avatars.githubusercontent.com${vercelLive.img}`,
      `font-src 'self' data:${vercelLive.font}`,
      // blob: for Monaco worker creation; cdn.jsdelivr.net for Pyodide + Monaco loader
      isDev
        ? `connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://localhost:* http://localhost:* https://cdn.jsdelivr.net https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.ingest.us.sentry.io${vercelLive.connect}`
        : `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.ingest.us.sentry.io${vercelLive.connect}`,
      // No frame-src in production: default-src 'self' applies, nothing may
      // be framed. Previews need the vercel.live feedback iframe.
      ...(isVercelPreview ? ["frame-src 'self' https://vercel.live"] : []),
      // blob: required for Monaco editor web workers and Pyodide blob worker
      "worker-src 'self' blob:",
      "object-src 'none'",
      frameAncestors,
      "form-action 'self'",
      "base-uri 'self'",
      ...(isDev ? [] : ["upgrade-insecure-requests"]),
      // CSP violation reporting - only when endpoint is configured
      ...(process.env.NEXT_PUBLIC_SENTRY_CSP_REPORT_URI
        ? [`report-uri ${process.env.NEXT_PUBLIC_SENTRY_CSP_REPORT_URI}`]
        : []),
    ].join("; "),
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    // X-Frame-Options cannot name the console, so the framable route relies on
    // frame-ancestors alone, which every browser in use honours.
    ...(framable ? {} : { "X-Frame-Options": "DENY" }),
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
}

function applySecurityHeaders(response: NextResponse, nonce: string, pathname: string): void {
  const headers = buildSecurityHeaders(nonce, pathname);
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
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/mfa") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/") ||
    pathname === "/verify" ||
    pathname.startsWith("/verify/") ||
    pathname === "/auth/confirm" ||
    pathname.startsWith("/u/") ||
    pathname.startsWith("/contact") ||
    pathname === "/catalogue" ||
    pathname === "/glossaire" ||
    pathname === "/download" ||
    pathname === "/legal" ||
    pathname.startsWith("/legal/") ||
    pathname === "/privacy" ||
    // A banned account has to be able to reach the page that tells it so, and
    // to answer it. It is the one page the ban gate does not send people away
    // from - and somebody banned before finishing onboarding must not be sent
    // round to /onboarding instead.
    pathname === "/banned" ||
    pathname.startsWith("/account/delete/") ||
    // The link of an inactivity notice: whoever follows it may no longer
    // remember how to sign in, which is the point of the link.
    pathname === "/account/keep" ||
    pathname.startsWith("/account/keep/") ||
    // The editor's preview of a draft: its token is its credential, and the
    // console's editor frames it without a session on this site.
    isPreviewRoute(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    // Crawler and PWA files. Without these the middleware answered /robots.txt
    // and /sitemap.xml with the login page, so search engines received HTML
    // where they expected rules, and /manifest.webmanifest never resolved.
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/icon.png" ||
    pathname === "/apple-icon.png"
  );
}

// Which routes need a session is the route registry's (lib/routes.ts), the
// list robots.txt and the sidebar read too.
export { isProtectedRoute };

/**
 * The pages a session that still owes its second-factor code may open: the
 * support form and the legal texts, none of which hold anything of the account.
 *
 * Everything else goes to /mfa until the code is typed. But the code screen is
 * where somebody who lost the phone ends up, and the only way out for them is
 * to write to the team: with the gate in front of /contact, the link on that
 * screen, and the one in the mail that follows a reset, both brought them back
 * to the code. The form is open to visitors anyway; a session that has not
 * proved who it is files as one (contact-actions.ts).
 */
export function isOpenToPendingMfa(pathname: string): boolean {
  return (
    pathname === "/contact" ||
    pathname.startsWith("/contact/") ||
    pathname === "/legal" ||
    pathname.startsWith("/legal/") ||
    pathname === "/privacy"
  );
}

function isOnboardingRoute(pathname: string): boolean {
  return pathname.startsWith("/onboarding");
}

const PLACEMENT_TEST_ROUTE = "/onboarding/placement-test";

/** The placement test's pages: its introduction, its questions and its result. */
function isPlacementTestRoute(pathname: string): boolean {
  return pathname === PLACEMENT_TEST_ROUTE || pathname.startsWith(`${PLACEMENT_TEST_ROUTE}/`);
}

// ─── Auth calls, bounded ───────────────────────────────────────────────────
// The middleware runs on every request, and getSession() refreshes an expired
// token over the network. When the auth host is unreachable the GoTrue client
// retries with backoff instead of failing fast, so a single outage kept the
// middleware alive past Vercel's 25s budget and turned *every* route - the
// landing page and /login included - into a 504 MIDDLEWARE_INVOCATION_TIMEOUT.
//
// A dependency being down should cost the session, not the whole site: the
// call is capped, and a visitor whose session cannot be verified is treated as
// logged out, so public pages keep being served.
const AUTH_CALL_TIMEOUT_MS = 3_000;

async function withTimeout<T>(promise: PromiseLike<T>, label: string): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${String(AUTH_CALL_TIMEOUT_MS)}ms`));
        }, AUTH_CALL_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    // Logged, not thrown: the request still has to be answered. The label is
    // an argument rather than part of the string so the format string stays
    // constant and cannot be forged by what is interpolated into it.
    console.error("[middleware] auth call failed:", label, error);
    return null;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * What the auth server says of the session the cookie carries:
 *  - "live": it knows the session;
 *  - "gone": it answered that the session does not exist (deleted by "Déconnecter
 *    toutes les sessions", by a global sign-out, or by the removal of the second
 *    factor), or that the account does not (deleted);
 *  - "unreachable": no answer, or one that says nothing of the session (a 5xx).
 *
 * getSession() cannot tell: it reads the cookie, which stays valid for the
 * hour its token lasts. getUser() asks over the network. For a deleted session
 * (auth-js raises "session_not_found" as an AuthSessionMissingError), auth-js
 * has dropped the session from the client's storage and @supabase/ssr has
 * turned that into cookie removals through `setAll`, which has finished by the
 * time this resolves (the sign-out event is awaited): the response built there
 * carries them, so the next request starts signed out.
 *
 * A deleted account is answered differently: GoTrue checks the user named by
 * the token's `sub` before it looks for the session, and says 403
 * "user_not_found", a plain AuthApiError that auth-js does not turn into a
 * sign-out. It is "gone" all the same - nobody is sent into the app on its
 * word, so nobody loops - but the cookie stays until its token expires.
 */
type SessionCheck = "live" | "gone" | "unreachable";

function isGoneFromServer(error: unknown): boolean {
  if (isAuthSessionMissingError(error)) return true;
  return isAuthApiError(error) && error.code === "user_not_found";
}

async function checkSessionOnServer(
  getUser: () => PromiseLike<{ data: { user: unknown }; error: unknown }>,
): Promise<SessionCheck> {
  const result = await withTimeout(getUser(), "getUser");
  if (result === null) return "unreachable";
  if (result.data.user !== null) return "live";
  return isGoneFromServer(result.error) ? "gone" : "unreachable";
}

/**
 * Where a request to forum.<site> should land, or null when it is not one.
 *
 * Built from NEXT_PUBLIC_SITE_URL rather than from the incoming host, so the
 * scheme and the canonical hostname come from configuration instead of from a
 * header the caller controls - a Host of "forum.evil.example" cannot turn this
 * into an open redirect.
 */
function forumSubdomainTarget(request: NextRequest): URL | null {
  const host = request.headers.get("host");
  if (host?.startsWith("forum.") !== true) return null;

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site === undefined || site === "") return null;

  const { pathname, search } = request.nextUrl;
  // forum.<site>/general and forum.<site>/forum/general are the same place.
  const suffix =
    pathname === "/" ? "" : pathname.startsWith("/forum") ? pathname.slice(6) : pathname;
  const target = new URL(`/forum${suffix}`, site);
  target.search = search;
  return target;
}

// ─── Middleware ────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Generate a fresh nonce for every request - used in CSP and forwarded to
  // server components via x-nonce so Next.js stamps it on inline scripts.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // ── forum.cyberlearn.fr ──────────────────────────────────────────────
  // An address, not a second application. Serving the forum from the subdomain
  // would need the session cookie to be readable there, and it is host-scoped:
  // a signed-in person would arrive at a signed-out forum. So the subdomain
  // sends them to the canonical origin, where they already have a session, and
  // keeps the path and the query they asked for.
  const forumRedirect = forumSubdomainTarget(request);
  if (forumRedirect) {
    const redirectResponse = NextResponse.redirect(forumRedirect, 308);
    applySecurityHeaders(redirectResponse, nonce, pathname);
    return redirectResponse;
  }

  // Supabase can fall back to the Site URL when an OAuth redirect is not
  // allow-listed. Exchange the PKCE code before rendering the landing page
  // or checking an existing session, using the regular callback safeguards.
  if (pathname === "/" && request.nextUrl.searchParams.has("code")) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    const callbackResponse = NextResponse.redirect(callbackUrl);
    callbackResponse.headers.set("Cache-Control", "no-store");
    applySecurityHeaders(callbackResponse, nonce, pathname);
    callbackResponse.headers.set("Referrer-Policy", "no-referrer");
    return callbackResponse;
  }

  // Build request headers that include the nonce so layout.tsx can read it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // One id per request for the server's logs (lib/request-id.ts); set, not
  // added, so whatever the client sent under that name is gone.
  const requestId = requestIdFor(request);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  // Block /dev/* in production - return 404, not 403 (don't reveal route existence)
  if (isDevRoute(pathname) && process.env.NODE_ENV === "production") {
    const notFound = new NextResponse(null, { status: 404 });
    applySecurityHeaders(notFound, nonce, pathname);
    return notFound;
  }

  // Default response - forwards our custom headers (including x-nonce) downstream
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars aren't set yet (local dev without .env.local), skip auth checks
  if (!supabaseUrl || !supabaseAnonKey) {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    applySecurityHeaders(res, nonce, pathname);
    res.headers.set(REQUEST_ID_HEADER, requestId);
    return res;
  }

  // Create Supabase client - MUST use this cookie pattern for SSR session refresh.
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

  // One question to the auth server per request, however many branches below
  // need the answer.
  let serverCheck: Promise<SessionCheck> | null = null;
  const sessionOnServer = (): Promise<SessionCheck> => {
    serverCheck ??= checkSessionOnServer(() => supabase.auth.getUser());
    return serverCheck;
  };

  // getSession() reads the JWT from cookies and refreshes it when it has
  // expired, which is a network call - hence the cap. It does not ask the
  // server whether the session still exists: server components use getUser()
  // for security, and so do the two decisions below that must not trust the
  // cookie (sessionOnServer).
  const sessionResult = await withTimeout(supabase.auth.getSession(), "getSession");
  const user = sessionResult?.data.session?.user ?? null;

  // ── Routing logic ──────────────────────────────────────────────────────

  if (!user) {
    // Unauthenticated user trying to access a protected route
    if (isProtectedRoute(pathname)) {
      const loginUrl = new URL("/login", request.url);
      // The query comes along: /dashboard?settings=notifications, where a
      // settings link from an e-mail lands, opens the drawer after sign-in.
      loginUrl.searchParams.set("redirectTo", `${pathname}${request.nextUrl.search}`);
      const redirectResponse = NextResponse.redirect(loginUrl);
      applySecurityHeaders(redirectResponse, nonce, pathname);
      return redirectResponse;
    }
  } else {
    const isMfaRoute = pathname.startsWith("/mfa");
    if (!isMfaRoute && !pathname.startsWith("/auth/") && !isOpenToPendingMfa(pathname)) {
      const assurance = await withTimeout(
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        "getAuthenticatorAssuranceLevel",
      );
      let mustTypeCode: boolean;
      if (assurance === null || assurance.error) {
        // Unreachable auth is treated like a failed check: send the user to the
        // MFA gate rather than letting them through unverified.
        mustTypeCode = true;
      } else if (assurance.data.nextLevel === "aal2" && assurance.data.currentLevel !== "aal2") {
        // The cookie says a code is owed, and a cookie outlives its session. The
        // person at the code screen whose factor the team just removed (which
        // ends every session of the account), or whose sessions were all
        // closed, was sent from /mfa to /login by the page, which asks the
        // server, and from /login back to /mfa by this gate, which did not:
        // the same redirect loop as below. A session the server does not know
        // owes nothing; it falls through (its cookie is dropped by `response`).
        mustTypeCode = (await sessionOnServer()) !== "gone";
      } else {
        mustTypeCode = false;
      }
      if (mustTypeCode) {
        const mfaUrl = new URL("/mfa", request.url);
        mfaUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
        const redirectResponse = NextResponse.redirect(mfaUrl);
        applySecurityHeaders(redirectResponse, nonce, pathname);
        return redirectResponse;
      }
    }

    // Authenticated user - check onboarding completion
    // We use app_metadata.onboarding_complete set by the callback route
    // to avoid a DB query on every request.
    const isOnboardingComplete = user.app_metadata.onboarding_complete === true;

    // The landing page exists to explain the site to somebody who has not
    // signed up. For somebody who has, it is a dead end - and it is where a
    // good number of links inside the app used to deposit them, starting with
    // the logo. So "/" now goes wherever the rest of the application would
    // have sent them: onboarding while that is unfinished, the dashboard once
    // it is done. Signed-out visitors still get the landing page, untouched.
    //
    // Doing it here rather than in each link fixes the links nobody has
    // enumerated yet, plus bookmarks and the address bar, and it is decided
    // before the landing page renders at all - so the page component, its
    // revalidation and its database reads are untouched.
    const isLanding = pathname === "/";

    if (
      !isOnboardingComplete &&
      (isLanding || (!isOnboardingRoute(pathname) && !isPublicRoute(pathname)))
    ) {
      const onboardingUrl = new URL("/onboarding", request.url);
      const redirectResponse = NextResponse.redirect(onboardingUrl);
      applySecurityHeaders(redirectResponse, nonce, pathname);
      return redirectResponse;
    }

    // Completed-onboarding user visiting the landing, /login or /onboarding →
    // redirect to dashboard. Exception: the placement test. Its result page is
    // shown right after the test, and the console can reset somebody's test,
    // whose notice links to it: an account that already has a result is sent
    // to the dashboard by the test's own pages, which read the database.
    //
    // The cookie is not enough to say "signed in" here. getSession() above only
    // reads it, so a session deleted on the server (the console's "Déconnecter
    // toutes les sessions", a global sign-out from another browser) went on
    // looking alive for the hour its token lasts. The (app) layout, which does
    // ask the server, then sent the same person back to /login, and this branch
    // sent them to /dashboard again: ERR_TOO_MANY_REDIRECTS, on every sign-in
    // page, until the token expired. So the server is asked before anybody is
    // sent away from a page they have a reason to see, and a session it does not
    // know falls through to the page itself - with the cookie dropped by
    // `response` (setAll) when auth-js signs the session out, so the next
    // request starts signed out.
    if (
      isOnboardingComplete &&
      (isLanding ||
        ["/login", "/register", "/forgot-password"].includes(pathname) ||
        isOnboardingRoute(pathname)) &&
      !isPlacementTestRoute(pathname) &&
      (await sessionOnServer()) === "live"
    ) {
      const dashboardUrl = new URL("/dashboard", request.url);
      const redirectResponse = NextResponse.redirect(dashboardUrl);
      applySecurityHeaders(redirectResponse, nonce, pathname);
      return redirectResponse;
    }
  }

  applySecurityHeaders(response, nonce, pathname);
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  matcher: [
    // Exclude _next internals, favicon, common asset extensions,
    // AND /workers/* + /runtimes/* - these static script paths get
    // their own stricter CSP via next.config.ts headers().
    "/((?!_next/static|_next/image|favicon.ico|monitoring|workers|runtimes|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
