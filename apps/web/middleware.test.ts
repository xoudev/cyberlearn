import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { consoleOrigin, isProtectedRoute, middleware } from "./middleware";

/**
 * The session the mocked Supabase client hands the middleware. Set per test:
 * null is a visitor, an object is somebody signed in, and app_metadata decides
 * whether their onboarding is finished - the same flag the real callback sets.
 */
const auth = vi.hoisted(() => ({
  session: null as null | { user: { app_metadata: Record<string, unknown> } },
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: auth.session } }),
      mfa: {
        getAuthenticatorAssuranceLevel: () =>
          Promise.resolve({
            data: { currentLevel: "aal1", nextLevel: "aal1" },
            error: null,
          }),
      },
    },
  }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  auth.session = null;
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

  // /settings has no page: next.config redirects it before the middleware.
  it.each(["/catalogue", "/contact", "/page-inconnue", "/u/introuvable", "/settings"])(
    "lets Next render public and unknown route %s",
    (path) => {
      expect(isProtectedRoute(path)).toBe(false);
    },
  );
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

  it("still exchanges an OAuth code on / before deciding anything", async () => {
    // The Site URL fallback drops people on "/?code=..." with a session that
    // is not established yet. Redirecting that to the dashboard would throw
    // the code away and strand them.
    auth.session = { user: { app_metadata: { onboarding_complete: true } } };

    const response = await middleware(new NextRequest("https://cyberlearn.fr/?code=test-code"));

    expect(location(response)).toBe("/auth/callback");
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
