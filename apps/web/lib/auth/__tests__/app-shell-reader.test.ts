import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Who gets the app's shell around the legal texts and the contact form. Those
 * pages are open to a session that still owes its second-factor code (the way
 * to the team for somebody who lost the phone): the shell shows the account,
 * so such a session reads them as a visitor does.
 */

const m = vi.hoisted(() => ({
  getRequestUser: vi.fn<() => Promise<{ id: string } | null>>(),
  getActiveBan: vi.fn<() => Promise<{ id: string } | null>>(),
  getAuthenticatorAssuranceLevel:
    vi.fn<
      () => Promise<{
        data: { currentLevel: string | null; nextLevel: string | null } | null;
        error: unknown;
      }>
    >(),
}));

vi.mock("@/lib/auth", () => ({
  getRequestUser: m.getRequestUser,
  getActiveBan: m.getActiveBan,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () =>
    Promise.resolve({
      auth: { mfa: { getAuthenticatorAssuranceLevel: m.getAuthenticatorAssuranceLevel } },
    }),
}));
// password-flow's other half syncs profiles; only its MFA rule is read here.
vi.mock("@cyberlearn/db", () => ({ userRepository: {} }));

const { appShellReaderId } = await import("../app-shell-reader");

const READER = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  m.getRequestUser.mockResolvedValue({ id: READER });
  m.getActiveBan.mockResolvedValue(null);
  m.getAuthenticatorAssuranceLevel.mockResolvedValue({
    data: { currentLevel: "aal1", nextLevel: "aal1" },
    error: null,
  });
});

describe("appShellReaderId", () => {
  it("names the signed-in account with no second factor to type", async () => {
    expect(await appShellReaderId()).toBe(READER);
  });

  it("names the account once its second factor is typed", async () => {
    m.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal2", nextLevel: "aal2" },
      error: null,
    });

    expect(await appShellReaderId()).toBe(READER);
  });

  it("names nobody for a visitor", async () => {
    m.getRequestUser.mockResolvedValue(null);

    expect(await appShellReaderId()).toBeNull();
  });

  it("names nobody for a banned account, which the app is closed to", async () => {
    m.getActiveBan.mockResolvedValue({ id: "ban" });

    expect(await appShellReaderId()).toBeNull();
  });

  it("names nobody for a session that still owes its code", async () => {
    m.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal2" },
      error: null,
    });

    expect(await appShellReaderId()).toBeNull();
  });

  it("names nobody when the level cannot be read: unknown counts as owed", async () => {
    m.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: null, error: new Error("jwt") });

    expect(await appShellReaderId()).toBeNull();
  });
});
