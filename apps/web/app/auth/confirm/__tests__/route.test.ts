import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Where /auth/confirm sends a link it cannot use.
 *
 * A reset link cut short used to land on "La connexion a échoué.", and a spent
 * one on "Le lien de connexion a expiré" - it was never a sign-in link, and
 * nothing said to ask for another. And a class clicking its confirmation links
 * from the school's one address used to spend a single budget of five.
 */

const m = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  getUser: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
  signOut: vi.fn(),
  resolveUserPostSignInRoute: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ getAll: () => [], set: () => undefined }),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@cyberlearn/db/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: {
      verifyOtp: m.verifyOtp,
      getUser: m.getUser,
      signOut: m.signOut,
      mfa: { getAuthenticatorAssuranceLevel: m.getAuthenticatorAssuranceLevel },
    },
  }),
}));
vi.mock("@/lib/auth/password-flow", () => ({
  resolveUserPostSignInRoute: m.resolveUserPostSignInRoute,
}));
// A limiter that refuses everybody: the link must go through all the same.
vi.mock("@/lib/rate-limit", () => ({
  allowAuthAttempt: () => Promise.resolve(false),
  recordSignInFailure: () => Promise.resolve(),
}));

const { GET } = await import("../route");

function open(query: string): Promise<Response> {
  return GET(new NextRequest(`https://cyberlearn.fr/auth/confirm?${query}`));
}

function landing(response: Response): string {
  const location = new URL(response.headers.get("location") ?? "");
  return `${location.pathname}${location.search}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.verifyOtp.mockResolvedValue({ error: null });
  m.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  m.getAuthenticatorAssuranceLevel.mockResolvedValue({
    data: { currentLevel: "aal1", nextLevel: "aal1" },
    error: null,
  });
  m.resolveUserPostSignInRoute.mockResolvedValue("/onboarding");
});

describe("/auth/confirm", () => {
  it("says a link without its token is incomplete, in words /login knows", async () => {
    expect(landing(await open("type=recovery"))).toBe("/login?error=missing_token");
    expect(landing(await open("token_hash=abc"))).toBe("/login?error=missing_token");
    expect(m.verifyOtp).not.toHaveBeenCalled();
  });

  it("tells a spent reset link apart from a sign-in link", async () => {
    m.verifyOtp.mockResolvedValue({ error: new Error("Token has expired or is invalid") });
    expect(landing(await open("token_hash=abc&type=recovery"))).toBe(
      "/login?error=recovery_expired",
    );
  });

  it("keeps the sign-in wording for any other spent link", async () => {
    m.verifyOtp.mockResolvedValue({ error: new Error("Token has expired or is invalid") });
    expect(landing(await open("token_hash=abc&type=signup"))).toBe("/login?error=auth_failed");
  });

  it("lets a whole class through from one address: no per-IP budget here", async () => {
    for (let pupil = 0; pupil < 30; pupil++) {
      const response = await GET(
        new NextRequest("https://cyberlearn.fr/auth/confirm?token_hash=abc&type=signup", {
          headers: { "x-forwarded-for": "198.51.100.7" },
        }),
      );
      expect(landing(response)).toBe("/onboarding");
    }
  });

  it("opens the reset form with its grant after a recovery link", async () => {
    const response = await open("token_hash=abc&type=recovery");
    expect(landing(response)).toBe("/reset-password");
    expect(response.headers.get("set-cookie")).toContain("cl-pwd-recovery=1");
  });
});
