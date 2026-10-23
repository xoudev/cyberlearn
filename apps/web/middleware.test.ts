import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
} from "@supabase/supabase-js";
import { NextRequest, type NextResponse } from "next/server";
import { consoleOrigin, isProtectedRoute, middleware } from "./middleware";

/**
 * What the mocked Supabase client hands the middleware. Set per test.
 *
 * `session` is what the cookie says: null is a visitor, an object is somebody
 * signed in, and app_metadata decides whether their onboarding is finished -
 * the same flag the real callback sets.
 *
 * `serverKnowsSession` is what the auth server says. getSession() never asks it
 * (it reads the cookie), getUser() always does: when the sessions were deleted
 * on the server - the console's "Déconnecter toutes les sessions", a global
 * sign-out from another browser - the cookie stays valid until its token
 * expires, and only getUser() notices.
 */
const auth = vi.hoisted(() => ({
  session: null as null | { user: { app_metadata: Record<string, unknown> } },
  serverKnowsSession: true,
  /** The auth host does not answer: getUser() rejects. */
  serverDown: false,
  /** The auth host answers with a 5xx, which says nothing of the session. */
  serverFails: false,
  /** The account itself is gone: GoTrue answers 403 "user_not_found". */
  accountDeleted: false,
  getUserCalls: 0,
  /** The assurance level of the cookie's session. */
  assurance: { currentLevel: "aal1", nextLevel: "aal1" },
}));

/** The cookie auth-js drops when the server no longer knows the session. */
const SESSION_COOKIE = "sb-test-auth-token";

interface CookiesToSet {
  name: string;
  value: string;
  options: Record<string, unknown>;
}

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: { cookies: { setAll: (cookies: CookiesToSet[]) => void | Promise<void> } },
  ) => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: auth.session } }),
      getUser: async () => {
        auth.getUserCalls += 1;
        if (auth.serverDown) throw new Error("auth host unreachable");
        // auth-js returns a 5xx as an error; it does not throw it.
        if (auth.serverFails) {
          return { data: { user: null }, error: new AuthRetryableFetchError("Bad Gateway", 502) };
        }
        // GoTrue looks the user up before the session. auth-js raises this as a
        // plain AuthApiError and does not sign the session out.
        if (auth.accountDeleted) {
          return {
            data: { user: null },
            error: new AuthApiError(
              "User from sub claim in JWT does not exist",
              403,
              "user_not_found",
            ),
          };
        }
        if (auth.session !== null && auth.serverKnowsSession) {
          return { data: { user: auth.session.user }, error: null };
        }
        // What auth-js does on "session_not_found": it removes the session from
        // its storage, and @supabase/ssr turns that into cookie removals.
        await options.cookies.setAll([
          { name: SESSION_COOKIE, value: "", options: { maxAge: 0, path: "/" } },
        ]);
        return { data: { user: null }, error: new AuthSessionMissingError() };
      },
      mfa: {
        getAuthenticatorAssuranceLevel: () =>
          Promise.resolve({ data: auth.assurance, error: null }),
      },
    },
  }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  auth.session = null;
  auth.serverKnowsSession = true;
  auth.serverDown = false;
  auth.serverFails = false;
  auth.accountDeleted = false;
  auth.getUserCalls = 0;
  auth.assurance = { currentLevel: "aal1", nextLevel: "aal1" };
});

describe("OAuth Site URL fallback", () => {
  it("routes a landing-page code through the callback before session checks", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
    const response = await middleware(
      new NextRequest("https://cyberlearn.fr/?code=test-code&next=%2Fsettings"),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://cyberlearn.fr/auth/callback?code=test-code&next=%2Fsettings",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("keeps the callback on the incoming origin even with an untrusted next parameter", async () => {
    const response = await middleware(
      new NextRequest("https://www.cyberlearn.fr/?code=test-code&next=https://evil.example"),
    );
    const destination = new URL(response.headers.get("location") ?? "");
    expect(destination.origin).toBe("https://www.cyberlearn.fr");
    expect(destination.pathname).toBe("/auth/callback");
  });

  it.each(["/", "/?campaign=github", "/auth/callback?code=test-code", "/u/demo?code=test-code"])(
    "does not redirect ordinary pages or loop on %s",
    async (path) => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
      const response = await middleware(new NextRequest(`https://cyberlearn.fr${path}`));
      expect(response.headers.get("location")).toBeNull();
    },
  );
});

describe("protected route classification", () => {
  // /duels and /tournaments were left out when they were added: a signed-out
  // reader following a notification was sent to /login by the page itself,
  // without the way back, and landed on the dashboard once signed in.
  it.each([
    "/dashboard",
    "/lessons/python",
    "/paths/linux",
    "/profile",
    "/duels",
    "/duels/d1",
    "/tournaments",
    "/tournaments/t1/journal",
  ])("protects known application route %s", (path) => {
    expect(isProtectedRoute(path)).toBe(true);
  });

  // /settings, /changelog, /badges, /certificates, /revisions and /review have
  // no page: next.config redirects them before the middleware, to a window
  // over the dashboard or a tab of the profile. The glossary is public.
  it.each([
    "/catalogue",
    "/contact",
    "/page-inconnue",
    "/u/introuvable",
    "/settings",
    "/changelog",
    "/badges",
    "/certificates",
    "/revisions",
    "/review",
    "/glossaire",
  ])("lets Next render public and unknown route %s", (path) => {
    expect(isProtectedRoute(path)).toBe(false);
  });
});

describe("the landing page is for people who are not signed in", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
  });

  function location(response: { headers: Headers }): string | null {
    const raw = response.headers.get("location");
    return raw === null ? null : new URL(raw).pathname;
  }

  it("sends somebody signed in from / to their dashboard", async () => {
    // The complaint this fixes: a good number of links inside the app - the
    // logo first among them - deposited a signed-in person on the marketing
    // page, which has nothing for them.
    auth.session = { user: { app_metadata: { onboarding_complete: true } } };

    const response = await middleware(new NextRequest("https://cyberlearn.fr/"));

    expect(response.status).toBe(307);
    expect(location(response)).toBe("/dashboard");
  });

  it("sends somebody mid-onboarding from / to finish it", async () => {
    auth.session = { user: { app_metadata: {} } };

    const response = await middleware(new NextRequest("https://cyberlearn.fr/"));

    expect(response.status).toBe(307);
    expect(location(response)).toBe("/onboarding");
  });

  it("leaves the landing page alone for a visitor", async () => {
    auth.session = null;

    const response = await middleware(new NextRequest("https://cyberlearn.fr/"));

    expect(location(response)).toBeNull();
  });

  it("still lets somebody signed in read the public pages", async () => {
    // "/" is the dead end, not everything public. The catalogue, the legal
    // pages and a certificate check are all things a signed-in person has a
    // reason to open, and they stay open.
    auth.session = { user: { app_metadata: { onboarding_complete: true } } };

    for (const path of ["/catalogue", "/legal/terms", "/privacy", "/verify", "/download"]) {
      const response = await middleware(new NextRequest(`https://cyberlearn.fr${path}`));
      expect(location(response)).toBeNull();
    }
  });

  it("sends a finished sign-up from the onboarding steps to the dashboard", async () => {
    auth.session = { user: { app_metadata: { onboarding_complete: true } } };

    for (const path of ["/onboarding", "/onboarding/goals", "/onboarding/placement-testx"]) {
      const response = await middleware(new NextRequest(`https://cyberlearn.fr${path}`));
      expect(location(response), path).toBe("/dashboard");
    }
  });

  it("keeps the placement test open to a finished sign-up, for a test the console reset", async () => {
    // The console's notice links to the test. The pages themselves send an
    // account that already has a result to the dashboard.
    auth.session = { user: { app_metadata: { onboarding_complete: true } } };

    for (const path of [
      "/onboarding/placement-test",
      "/onboarding/placement-test/questions",
      "/onboarding/placement-test/result",
    ]) {
      const response = await middleware(new NextRequest(`https://cyberlearn.fr${path}`));
      expect(location(response), path).toBeNull();
    }
  });

  it("still exchanges an OAuth code on / before deciding anything", async () => {
    // The Site URL fallback drops people on "/?code=..." with a session that
    // is not established yet. Redirecting that to the dashboard would throw
    // the code away and strand them.
    auth.session = { user: { app_metadata: { onboarding_complete: true } } };

    const response = await middleware(new NextRequest("https://cyberlearn.fr/?code=test-code"));

    expect(location(response)).toBe("/auth/callback");
  });
});

describe("a session the auth server no longer knows", () => {
  // The bug: "Déconnecter toutes les sessions" in the console, or a global
  // sign-out from another browser, deletes the rows of auth.sessions. The cookie
  // of the other browsers stays valid until its token expires (an hour), and
  // getSession() - which only reads the cookie - kept calling them signed in.
  // The middleware sent them from /login to /dashboard, the (app) layout, which
  // asks the server, sent them back to /login, and the browser gave up with
  // ERR_TOO_MANY_REDIRECTS. These tests follow redirects the way a browser does.
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
    auth.session = { user: { app_metadata: { onboarding_complete: true } } };
    auth.serverKnowsSession = false;
  });

  /**
   * Opens `path` and follows the redirects, up to a browser's limit of twenty.
   * A page of the (app) group that the middleware lets through does what its
   * layout does (requireRequestUser), and /mfa does what its page does: it asks
   * the server who is there, and sends nobody to /login.
   */
  async function browse(path: string): Promise<{ visited: string[]; last: NextResponse }> {
    const visited: string[] = [];
    let url = new URL(path, "https://cyberlearn.fr");
    for (let hop = 0; hop < 20; hop += 1) {
      visited.push(`${url.pathname}${url.search}`);
      const response = await middleware(new NextRequest(url));
      const location = response.headers.get("location");
      if (location !== null) {
        url = new URL(location);
        continue;
      }
      const asksTheServer = isProtectedRoute(url.pathname) || url.pathname.startsWith("/mfa");
      if (asksTheServer && !auth.serverKnowsSession) {
        url = new URL("/login", url);
        continue;
      }
      return { visited, last: response };
    }
    throw new Error(`ERR_TOO_MANY_REDIRECTS: ${visited.join(" -> ")}`);
  }

  it("ends on the sign-in page instead of looping between /login and /dashboard", async () => {
    const { visited, last } = await browse("/dashboard");

    expect(visited).toEqual(["/dashboard", "/login"]);
    expect(last.headers.get("location")).toBeNull();
  });

  it.each(["/login", "/register", "/forgot-password", "/", "/onboarding", "/onboarding/goals"])(
    "serves %s instead of sending the account to a dashboard it cannot open",
    async (path) => {
      const response = await middleware(new NextRequest(`https://cyberlearn.fr${path}`));

      expect(response.headers.get("location"), path).toBeNull();
    },
  );

  it("drops the session cookie, so the next request starts signed out", async () => {
    const response = await middleware(new NextRequest("https://cyberlearn.fr/login"));

    const cleared = response.cookies.get(SESSION_COOKIE);
    expect(cleared?.value).toBe("");
    expect(response.headers.get("set-cookie")).toMatch(/Max-Age=0/i);
  });

  it("still carries the security headers once the cookie is dropped", async () => {
    const response = await middleware(new NextRequest("https://cyberlearn.fr/login"));

    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("x-request-id")).not.toBeNull();
  });

  it("sends a session that is still known on its way, as before", async () => {
    auth.serverKnowsSession = true;

    for (const path of ["/", "/login", "/register", "/forgot-password", "/onboarding"]) {
      const response = await middleware(new NextRequest(`https://cyberlearn.fr${path}`));
      expect(new URL(response.headers.get("location") ?? "").pathname, path).toBe("/dashboard");
    }
  });

  it("asks the server only when it is about to redirect, not on every page", async () => {
    auth.serverKnowsSession = true;

    for (const path of [
      "/dashboard",
      "/lessons/python",
      "/catalogue",
      "/contact",
      "/legal/terms",
    ]) {
      await middleware(new NextRequest(`https://cyberlearn.fr${path}`));
    }
    // A visitor has no session to check either.
    auth.session = null;
    await middleware(new NextRequest("https://cyberlearn.fr/login"));

    expect(auth.getUserCalls).toBe(0);
  });

  it("serves the sign-in page when the auth host does not answer, rather than looping", async () => {
    // An outage is no reason to send somebody round in circles: /dashboard would
    // fail to verify them too. The call is bounded and its failure is logged.
    auth.serverDown = true;
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const { visited } = await browse("/login");
      expect(visited).toEqual(["/login"]);
    } finally {
      logged.mockRestore();
    }
  });

  it("serves the sign-in page when the auth host answers with an error, and keeps the cookie", async () => {
    // A 5xx says nothing of the session: it is not "gone", so nothing is dropped.
    auth.serverFails = true;

    const { visited, last } = await browse("/login");

    expect(visited).toEqual(["/login"]);
    expect(last.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });

  it("ends on the sign-in page for a deleted account too, whose cookie auth-js leaves alone", async () => {
    // GoTrue checks the user before the session: an account deleted with its
    // sessions answers "user_not_found", not "session_not_found", and auth-js
    // does not sign that out. It is no more a reason to go to the dashboard.
    auth.accountDeleted = true;

    const { visited, last } = await browse("/dashboard");

    expect(visited).toEqual(["/dashboard", "/login"]);
    expect(last.headers.get("location")).toBeNull();
    expect(last.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });

  it("keeps the placement test open, without asking the server", async () => {
    const response = await middleware(
      new NextRequest("https://cyberlearn.fr/onboarding/placement-test"),
    );

    expect(response.headers.get("location")).toBeNull();
    expect(auth.getUserCalls).toBe(0);
  });

  it("asks the server once, however many decisions need the answer", async () => {
    await middleware(new NextRequest("https://cyberlearn.fr/login"));

    expect(auth.getUserCalls).toBe(1);
  });

  describe("when that session was waiting for its second-factor code", () => {
    // The lost-phone case itself: the person sits on the code screen, the team
    // removes the factor - which ends every session of the account - and the
    // page they reload asks the server, finds nobody, and sends them to /login,
    // where the gate used to read "a code is owed" off the cookie and send them
    // straight back to /mfa.
    beforeEach(() => {
      auth.assurance = { currentLevel: "aal1", nextLevel: "aal2" };
    });

    it("ends on the sign-in page instead of looping between /mfa and /login", async () => {
      const { visited, last } = await browse("/mfa");

      expect(visited).toEqual(["/mfa", "/login"]);
      expect(last.headers.get("location")).toBeNull();
      expect(last.cookies.get(SESSION_COOKIE)?.value).toBe("");
    });

    it("does not ask for a code either when the account itself was deleted", async () => {
      auth.accountDeleted = true;

      const { visited } = await browse("/mfa");

      expect(visited).toEqual(["/mfa", "/login"]);
    });

    it("does not send a protected page to a code that nobody can type", async () => {
      const { visited } = await browse("/dashboard");

      expect(visited).toEqual(["/dashboard", "/login"]);
    });

    it("still asks for the code of a session the server knows", async () => {
      auth.serverKnowsSession = true;

      const response = await middleware(new NextRequest("https://cyberlearn.fr/dashboard"));

      expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/mfa");
      expect(auth.getUserCalls).toBe(1);
    });

    it("still asks for the code when the auth host cannot be asked", async () => {
      // Fail closed, as before: a session that cannot be verified is not let in.
      auth.serverDown = true;
      const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);

      try {
        const response = await middleware(new NextRequest("https://cyberlearn.fr/dashboard"));
        expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/mfa");
      } finally {
        logged.mockRestore();
      }
    });

    it("still asks for the code when the auth host answers with an error", async () => {
      auth.serverFails = true;

      const response = await middleware(new NextRequest("https://cyberlearn.fr/lessons/python"));

      expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/mfa");
    });
  });
});

describe("a session that still owes its second-factor code", () => {
  // A learner who lost the phone sits on /mfa. The only way out is to write to
  // the team, and the form used to be behind the very gate that sent them
  // there: the link led back to the code.
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
    auth.session = { user: { app_metadata: { onboarding_complete: true } } };
    auth.assurance = { currentLevel: "aal1", nextLevel: "aal2" };
  });

  it.each([
    "/contact",
    "/contact?theme=SECURITY&subject=Double%20authentification",
    "/legal",
    "/legal/terms",
    "/privacy",
  ])("can still open %s", async (path) => {
    const response = await middleware(new NextRequest(`https://cyberlearn.fr${path}`));

    expect(response.headers.get("location")).toBeNull();
  });

  it.each([
    "/dashboard",
    "/lessons/python",
    "/profile",
    "/catalogue",
    "/api/me/export",
    "/contactez",
  ])("is still sent to the code from %s", async (path) => {
    const response = await middleware(new NextRequest(`https://cyberlearn.fr${path}`));

    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname, path).toBe("/mfa");
    expect(location.searchParams.get("next"), path).toBe(path);
  });

  it("is sent to the code from the pages that lead into the app, the sign-in ones included", async () => {
    for (const path of ["/", "/login"]) {
      const response = await middleware(new NextRequest(`https://cyberlearn.fr${path}`));
      expect(new URL(response.headers.get("location") ?? "").pathname, path).toBe("/mfa");
    }
  });

  it("is not asked for a code when the account has no second factor", async () => {
    auth.assurance = { currentLevel: "aal1", nextLevel: "aal1" };
    const response = await middleware(new NextRequest("https://cyberlearn.fr/dashboard"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("lets the contact form through once the code was typed too", async () => {
    auth.assurance = { currentLevel: "aal2", nextLevel: "aal2" };
    const response = await middleware(new NextRequest("https://cyberlearn.fr/contact"));
    expect(response.headers.get("location")).toBeNull();
  });
});

describe("a visitor sent to sign in", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
  });

  it("comes back to the address asked for, query included", async () => {
    // A settings link from an e-mail lands on /dashboard?settings=...; the
    // drawer opens on that section only if the query survives the sign-in.
    const response = await middleware(
      new NextRequest("https://cyberlearn.fr/dashboard?settings=notifications"),
    );
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("redirectTo")).toBe("/dashboard?settings=notifications");
  });

  it("comes back to a plain path as it was", async () => {
    const response = await middleware(new NextRequest("https://cyberlearn.fr/lessons/python"));
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.searchParams.get("redirectTo")).toBe("/lessons/python");
  });

  it("comes back to the tournament or the duel a notification pointed at", async () => {
    for (const path of ["/tournaments/t1", "/duels/d1"]) {
      const response = await middleware(new NextRequest(`https://cyberlearn.fr${path}`));
      const location = new URL(response.headers.get("location") ?? "");
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("redirectTo")).toBe(path);
    }
  });
});

describe("request id", () => {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
  });

  it("gives the request an id of its own, whatever the client sent, and returns it", async () => {
    const response = await middleware(
      new NextRequest("https://cyberlearn.fr/catalogue", {
        headers: { "x-request-id": "forged-by-the-client" },
      }),
    );
    // What the handlers will read: Next forwards a rewritten request header
    // to them under this name.
    const forwarded = response.headers.get("x-middleware-request-x-request-id");
    expect(forwarded).toMatch(UUID);
    expect(response.headers.get("x-request-id")).toBe(forwarded);
  });

  it("takes Vercel's id when there is one, to find the same request in the host's logs", async () => {
    const vercelId = "cdg1::abcde-1712345678901-0123456789ab";
    const response = await middleware(
      new NextRequest("https://cyberlearn.fr/catalogue", { headers: { "x-vercel-id": vercelId } }),
    );
    expect(response.headers.get("x-middleware-request-x-request-id")).toBe(vercelId);
  });

  it("gives two requests two ids", async () => {
    const ids = await Promise.all(
      [1, 2].map(async () =>
        (await middleware(new NextRequest("https://cyberlearn.fr/catalogue"))).headers.get(
          "x-request-id",
        ),
      ),
    );
    expect(ids[0]).not.toBe(ids[1]);
  });
});

describe("the lesson editor's preview route", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
  });

  function csp(response: Response): string {
    return response.headers.get("content-security-policy") ?? "";
  }

  it("may be framed by this site and by the console, and by nothing else", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://cyberlearn.fr");
    vi.stubEnv("NEXT_PUBLIC_ADMIN_URL", "https://admin.cyberlearn.fr/");
    const response = await middleware(new NextRequest("https://cyberlearn.fr/preview/abc"));
    expect(csp(response)).toContain("frame-ancestors 'self' https://admin.cyberlearn.fr;");
    expect(response.headers.get("x-frame-options")).toBeNull();
  });

  it("lets the deployed console in when the variable still holds the development default", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://cyberlearn.fr");
    vi.stubEnv("NEXT_PUBLIC_ADMIN_URL", "http://localhost:3001");
    const response = await middleware(new NextRequest("https://cyberlearn.fr/preview/abc"));
    expect(csp(response)).toContain("frame-ancestors 'self' https://admin.cyberlearn.fr;");
    expect(csp(response)).not.toContain("localhost");
  });

  it("frames only this site when no console can be named", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubEnv("NEXT_PUBLIC_ADMIN_URL", "");
    const response = await middleware(new NextRequest("https://cyberlearn.fr/preview/abc"));
    expect(csp(response)).toContain("frame-ancestors 'self';");
  });

  describe("the console's origin", () => {
    it.each([
      ["https://admin.cyberlearn.fr/", "https://cyberlearn.fr", "https://admin.cyberlearn.fr"],
      ["https://console.example.org/x", "https://cyberlearn.fr", "https://console.example.org"],
      [undefined, "https://cyberlearn.fr", "https://admin.cyberlearn.fr"],
      ["", "https://cyberlearn.fr/", "https://admin.cyberlearn.fr"],
      ["not a url", "https://cyberlearn.fr", "https://admin.cyberlearn.fr"],
      ["http://localhost:3001", "https://cyberlearn.fr", "https://admin.cyberlearn.fr"],
      ["http://127.0.0.1:3001", "https://cyberlearn.fr", "https://admin.cyberlearn.fr"],
      ["http://[::1]:3001", "https://cyberlearn.fr", "https://admin.cyberlearn.fr"],
      ["http://admin.localhost:3001", "https://cyberlearn.fr", "https://admin.cyberlearn.fr"],
      ["http://localhost:3001", "http://localhost:3000", "http://localhost:3001"],
      ["http://localhost:3001", undefined, "http://localhost:3001"],
      ["http://localhost:3001", "not a url", "http://localhost:3001"],
      [undefined, "http://localhost:3000", null],
      [undefined, undefined, null],
      ["https://admin.cyberlearn.fr", "https://cyberlearn.fr:8443", "https://admin.cyberlearn.fr"],
      [undefined, "https://cyberlearn.fr:8443", "https://admin.cyberlearn.fr:8443"],
    ])("console %s, site %s: %s", (adminUrl, siteUrl, expected) => {
      expect(consoleOrigin(adminUrl, siteUrl)).toBe(expected);
    });
  });

  it("keeps every other page out of every frame", async () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_URL", "https://admin.cyberlearn.fr");
    for (const path of ["/", "/catalogue", "/lessons/x", "/previews", "/preview"]) {
      const response = await middleware(new NextRequest(`https://cyberlearn.fr${path}`));
      expect(csp(response), path).toContain("frame-ancestors 'none'");
      expect(response.headers.get("x-frame-options"), path).toBe("DENY");
    }
  });

  it("is public: no login, and no onboarding detour for a session that has not finished it", async () => {
    const visitor = await middleware(new NextRequest("https://cyberlearn.fr/preview/abc"));
    expect(visitor.headers.get("location")).toBeNull();

    auth.session = { user: { app_metadata: {} } };
    const unfinished = await middleware(new NextRequest("https://cyberlearn.fr/preview/abc"));
    expect(unfinished.headers.get("location")).toBeNull();
  });
});
