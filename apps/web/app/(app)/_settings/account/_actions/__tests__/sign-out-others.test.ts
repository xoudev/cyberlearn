import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireRequestUser: vi.fn<() => Promise<{ id: string }>>(),
  signOut: vi.fn<(options: { scope: string }) => Promise<{ error: Error | null }>>(),
  limit: vi.fn<() => Promise<{ success: boolean; retryAfterSeconds: number }>>(),
  logError: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireRequestUser: m.requireRequestUser }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => Promise.resolve({ auth: { signOut: m.signOut } }),
}));
vi.mock("@/lib/rate-limit", () => ({ checkSessionsSignOut: m.limit }));
vi.mock("@/lib/request-logger", () => ({
  requestLogger: () => Promise.resolve({ error: m.logError }),
}));

const { signOutOtherSessions } = await import("../sign-out-others");
const { SIGN_OUT_OTHERS_IDLE } = await import("../sign-out-others-state");

function run(): ReturnType<typeof signOutOtherSessions> {
  return signOutOtherSessions();
}

beforeEach(() => {
  vi.clearAllMocks();
  m.requireRequestUser.mockResolvedValue({ id: "u1" });
  m.limit.mockResolvedValue({ success: true, retryAfterSeconds: 0 });
  m.signOut.mockResolvedValue({ error: null });
});

describe("signOutOtherSessions", () => {
  it("closes the other sessions and keeps this one", async () => {
    const state = await run();

    expect(m.signOut).toHaveBeenCalledExactlyOnceWith({ scope: "others" });
    expect(state.status).toBe("done");
    expect(state.message).toContain("Celle-ci reste ouverte");
  });

  it("starts with nothing to say", () => {
    expect(SIGN_OUT_OTHERS_IDLE).toEqual({ status: "idle", message: null });
  });

  it("is the session's own account: nobody signed in closes nothing", async () => {
    m.requireRequestUser.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(run()).rejects.toThrow("NEXT_REDIRECT");
    expect(m.signOut).not.toHaveBeenCalled();
  });

  it("says nothing was closed when Supabase refuses, and logs why", async () => {
    m.signOut.mockResolvedValue({ error: new Error("auth host unreachable") });

    const state = await run();

    expect(state).toEqual({
      status: "error",
      message: "La déconnexion a échoué : aucune session n’a été fermée. Réessaie.",
    });
    expect(m.logError).toHaveBeenCalledWith(
      { scope: "settings/sessions", err: "auth host unreachable" },
      "sign out others failed",
    );
  });

  it("waits once the budget is spent, with how long, and closes nothing", async () => {
    m.limit.mockResolvedValue({ success: false, retryAfterSeconds: 300 });

    const state = await run();

    expect(state).toEqual({
      status: "error",
      message: "Trop de demandes. Réessaie dans 5 minutes.",
    });
    expect(m.signOut).not.toHaveBeenCalled();
  });
});
