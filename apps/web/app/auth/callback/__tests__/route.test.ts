import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /auth/callback: every GitHub sign-in comes through it, so a class signing in
 * from the school's one address used to spend a single budget of five. And a
 * reset link it could not use was called a sign-in link.
 */

const m = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
  resolveUserPostSignInRoute: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ getAll: () => [], set: () => undefined }),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@cyberlearn/db/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: {
      exchangeCodeForSession: m.exchangeCodeForSession,
      getUser: m.getUser,
      signOut: vi.fn(),
      mfa: { getAuthenticatorAssuranceLevel: m.getAuthenticatorAssuranceLevel },
    },
  }),
}));
vi.mock("@/lib/auth/password-flow", () => ({
  resolveUserPostSignInRoute: m.resolveUserPostSignInRoute,
}));
// A limiter that refuses everybody: the callback must go through all the same.
vi.mock("@/lib/rate-limit", () => ({
  allowAuthAttempt: () => Promise.resolve(false),
  recordSignInFailure: () => Promise.resolve(),
}));

const { GET } = await import("../route");

function landing(response: Response): string {
  const location = new URL(response.headers.get("location") ?? "");
  return `${location.pathname}${location.search}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.exchangeCodeForSession.mockResolvedValue({ error: null });
  m.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  m.getAuthenticatorAssuranceLevel.mockResolvedValue({
    data: { currentLevel: "aal1", nextLevel: "aal1" },
    error: null,
  });
  m.resolveUserPostSignInRoute.mockResolvedValue("/dashboard");
});

describe("/auth/callback", () => {
  it("lets a whole class sign in with GitHub from one address", async () => {
    for (let pupil = 0; pupil < 30; pupil++) {
      const response = await GET(
        new NextRequest("https://cyberlearn.fr/auth/callback?code=abc", {
          headers: { "x-forwarded-for": "198.51.100.7" },
        }),
      );
      expect(landing(response)).toBe("/dashboard");
    }
  });

  it("tells a spent reset link apart from a sign-in link", async () => {
    m.exchangeCodeForSession.mockResolvedValue({ error: new Error("invalid code") });
    const response = await GET(
      new NextRequest("https://cyberlearn.fr/auth/callback?code=abc&next=/reset-password"),
    );
    expect(landing(response)).toBe("/login?error=recovery_expired");
  });

  it("keeps the sign-in wording for a GitHub code that did not take", async () => {
    m.exchangeCodeForSession.mockResolvedValue({ error: new Error("invalid code") });
    const response = await GET(new NextRequest("https://cyberlearn.fr/auth/callback?code=abc"));
    expect(landing(response)).toBe("/login?error=auth_failed");
  });
});
