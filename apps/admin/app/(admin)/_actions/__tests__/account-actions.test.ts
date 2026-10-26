import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * « Mon compte »: the administrator closes their own sessions through
 * Supabase, with their own token, and the gesture is traced afterwards. A
 * trace that cannot be written is said, never turned into an error: by then
 * the sessions are closed.
 */

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn<() => Promise<{ id: string; email: undefined; role: "ADMIN" }>>(),
  signOut: vi.fn<(options: { scope: string }) => Promise<{ error: Error | null }>>(),
  record: vi.fn<(entry: Record<string, unknown>) => Promise<void>>(),
  logError: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => Promise.resolve({ auth: { signOut: m.signOut } }),
}));
vi.mock("@cyberlearn/db", () => ({ auditLogRepository: { record: m.record } }));
vi.mock("@cyberlearn/lib/logger", () => ({
  errorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
  logger: { error: m.logError },
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

const { signOutMySessionsAction } = await import("../account-actions");

const ADMIN = "11111111-1111-4111-8111-111111111111";

function form(scope: string): FormData {
  const data = new FormData();
  data.set("scope", scope);
  return data;
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.requireAdminAction.mockResolvedValue({ id: ADMIN, email: undefined, role: "ADMIN" });
  m.signOut.mockResolvedValue({ error: null });
  m.record.mockResolvedValue(undefined);
});

describe("signOutMySessionsAction", () => {
  it("closes the other sessions, keeps this one, and traces the gesture", async () => {
    const state = await signOutMySessionsAction({}, form("others"));
    expect(m.signOut).toHaveBeenCalledWith({ scope: "others" });
    expect(m.record).toHaveBeenCalledWith({
      actorId: ADMIN,
      action: "admin.account.sessions.others_revoked",
      targetType: "User",
      targetId: ADMIN,
      metadata: { scope: "others" },
    });
    expect(state).toMatchObject({ ok: true, auditFailed: false });
    expect(state.notice).toContain("Celle-ci reste ouverte");
  });

  it("closes every session, this one included, and sends to the sign-in", async () => {
    await expect(signOutMySessionsAction({}, form("global"))).rejects.toThrow(
      "NEXT_REDIRECT:/login",
    );
    expect(m.signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(m.record.mock.calls[0]?.[0]).toMatchObject({
      action: "admin.account.sessions.all_revoked",
    });
  });

  it("refuses a scope it does not know, without signing anybody out", async () => {
    expect(await signOutMySessionsAction({}, form("local"))).toEqual({
      error: "Paramètres invalides.",
    });
    expect(m.signOut).not.toHaveBeenCalled();
    expect(m.record).not.toHaveBeenCalled();
  });

  it("says nothing was closed when Supabase refuses, and traces nothing", async () => {
    m.signOut.mockResolvedValueOnce({ error: new Error("network") });
    expect(await signOutMySessionsAction({}, form("others"))).toEqual({
      error: "La déconnexion a échoué. Aucune session n'a été fermée.",
    });
    expect(m.record).not.toHaveBeenCalled();
    expect(m.logError).toHaveBeenCalled();
  });

  it("reports a trace it could not write, with the sessions closed all the same", async () => {
    m.record.mockRejectedValueOnce(new Error("db down"));
    const state = await signOutMySessionsAction({}, form("others"));
    expect(state).toMatchObject({ ok: true, auditFailed: true });
    expect(m.logError).toHaveBeenCalled();
  });

  it("checks the caller is an admin before anything else", async () => {
    m.requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT:/login"));
    await expect(signOutMySessionsAction({}, form("others"))).rejects.toThrow(
      "NEXT_REDIRECT:/login",
    );
    expect(m.signOut).not.toHaveBeenCalled();
  });
});
