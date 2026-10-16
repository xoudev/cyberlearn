import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A sign-in through the MFA challenge ends like any other one.
 *
 * The route resolver stops at /mfa before it synchronises the profile, so an
 * account with a verified factor never had its lastActiveAt moved by signing
 * in, and could be erased for inactivity right after signing in to keep
 * itself. The code form now finishes the sign-in on the server; these tests
 * hold it to the synchronisation and to the same routing as the other doors.
 */

const m = vi.hoisted(() => ({
  getUser: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
  signOut: vi.fn(),
  upsertFromAuth: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () =>
    Promise.resolve({
      auth: {
        getUser: m.getUser,
        signOut: m.signOut,
        mfa: { getAuthenticatorAssuranceLevel: m.getAuthenticatorAssuranceLevel },
      },
    }),
}));
vi.mock("@cyberlearn/db", () => ({ userRepository: { upsertFromAuth: m.upsertFromAuth } }));
vi.mock("@sentry/nextjs", () => ({ captureException: m.captureException }));

const { completeMfaSignIn } = await import("../mfa-sign-in");

const USER = {
  id: "user-1",
  email: "alex@example.fr",
  user_metadata: { full_name: "Alex" },
  app_metadata: { onboarding_complete: true },
};

function assurance(currentLevel: string, nextLevel: string): void {
  m.getAuthenticatorAssuranceLevel.mockResolvedValue({
    data: { currentLevel, nextLevel },
    error: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  m.getUser.mockResolvedValue({ data: { user: USER } });
  m.upsertFromAuth.mockResolvedValue({ username: "alex", role: "USER" });
  m.signOut.mockResolvedValue({ error: null });
});

describe("completeMfaSignIn", () => {
  it("synchronises the profile once the code is accepted, then goes where it was asked", async () => {
    assurance("aal2", "aal2");
    await expect(completeMfaSignIn("/paths")).resolves.toEqual({ redirectTo: "/paths" });
    expect(m.upsertFromAuth).toHaveBeenCalledWith({
      id: "user-1",
      email: "alex@example.fr",
      displayName: "Alex",
      avatarUrl: null,
    });
  });

  it("sends an account that has not finished signing up to its onboarding step", async () => {
    assurance("aal2", "aal2");
    m.upsertFromAuth.mockResolvedValue({ username: null, role: "USER" });
    await expect(completeMfaSignIn("/paths")).resolves.toEqual({ redirectTo: "/onboarding" });
  });

  it("sends a session still short of its level back to the challenge, unsynchronised", async () => {
    assurance("aal1", "aal2");
    await expect(completeMfaSignIn("/paths")).resolves.toEqual({
      redirectTo: "/mfa?next=%2Fpaths",
    });
    expect(m.upsertFromAuth).not.toHaveBeenCalled();
  });

  it("sends a request without a session to the sign-in page", async () => {
    m.getUser.mockResolvedValue({ data: { user: null } });
    await expect(completeMfaSignIn("/paths")).resolves.toEqual({ redirectTo: "/login" });
    expect(m.upsertFromAuth).not.toHaveBeenCalled();
  });

  it("falls back to the dashboard for a destination off the site", async () => {
    assurance("aal2", "aal2");
    await expect(completeMfaSignIn("//evil.example")).resolves.toEqual({
      redirectTo: "/dashboard",
    });
  });

  it("closes the session it could not initialise, as the other sign-in doors do", async () => {
    assurance("aal2", "aal2");
    m.upsertFromAuth.mockRejectedValue(new Error("db down"));
    await expect(completeMfaSignIn("/paths")).resolves.toEqual({
      redirectTo: "/login?error=profile_sync_failed",
    });
    expect(m.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(m.captureException).toHaveBeenCalledOnce();
  });
});
