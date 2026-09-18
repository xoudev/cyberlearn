import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { isProtectedRoute, middleware } from "./middleware";

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
  it.each(["/dashboard", "/lessons/python", "/paths/linux", "/settings/account", "/friends"])(
    "protects known application route %s",
    (path) => {
      expect(isProtectedRoute(path)).toBe(true);
    },
  );

  it.each(["/catalogue", "/contact", "/page-inconnue", "/u/introuvable"])(
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
