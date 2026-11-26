import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * requireAdminAction, the gate of every console page, action and route
 * handler. A session whose account is not ADMIN used to get notFound() from
 * it: a 404 on every page, the sign-out button out of reach in the sidebar the
 * layout no longer drew. It is sent to the access-denied screen now, and that
 * before any question of second factor.
 */

interface Factor {
  id?: string;
  factor_type: string;
  status: string;
}

/** What the mocked Supabase client and users table report. Set per test. */
interface MockState {
  user: { id: string; email?: string; factors?: Factor[] } | null;
  role: { role: string } | null;
  assurance: { data: { currentLevel: string }; error: Error | null };
}
const m = vi.hoisted(
  (): MockState => ({
    user: null,
    role: null,
    assurance: { data: { currentLevel: "aal1" }, error: null },
  }),
);
const findRoleById = vi.hoisted(() => vi.fn());
const checkPins = vi.hoisted(() =>
  vi.fn<(userId: string, ids: readonly string[]) => Promise<string>>(),
);

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
  notFound: () => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  },
}));

vi.mock("@cyberlearn/db", () => ({
  userRepository: { findRoleById },
  adminMfaPinRepository: { check: checkPins },
}));
vi.mock("@cyberlearn/lib/logger", () => ({ logger: { warn: vi.fn() } }));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () =>
    Promise.resolve({
      auth: {
        getUser: () => Promise.resolve({ data: { user: m.user }, error: null }),
        mfa: { getAuthenticatorAssuranceLevel: () => Promise.resolve(m.assurance) },
      },
    }),
}));

const { requireAdminAction } = await import("../auth");

const VERIFIED_TOTP: Factor[] = [{ id: "f1", factor_type: "totp", status: "verified" }];

beforeEach(() => {
  m.user = null;
  m.role = null;
  m.assurance = { data: { currentLevel: "aal1" }, error: null };
  findRoleById.mockReset();
  findRoleById.mockImplementation(() => Promise.resolve(m.role));
  checkPins.mockReset();
  checkPins.mockResolvedValue("match");
});

describe("requireAdminAction", () => {
  it("sends a request without a session to the sign-in page", async () => {
    await expect(requireAdminAction()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("sends an administrator demoted mid-session to the access-denied screen", async () => {
    m.user = { id: "u1", email: "ex-admin@x.fr", factors: VERIFIED_TOTP };
    m.role = { role: "STUDENT" };
    m.assurance = { data: { currentLevel: "aal2" }, error: null };
    await expect(requireAdminAction()).rejects.toThrow("NEXT_REDIRECT:/access-denied");
  });

  it("tells a non-admin so before asking for a factor it has no use for", async () => {
    m.user = { id: "u1", factors: [] };
    m.role = { role: "TEACHER" };
    await expect(requireAdminAction()).rejects.toThrow("NEXT_REDIRECT:/access-denied");
  });

  it("treats an account without a profile row as not ADMIN", async () => {
    m.user = { id: "u1", factors: VERIFIED_TOTP };
    m.role = null;
    m.assurance = { data: { currentLevel: "aal2" }, error: null };
    await expect(requireAdminAction()).rejects.toThrow("NEXT_REDIRECT:/access-denied");
  });

  it("sends an administrator without a verified factor to enrol one", async () => {
    m.user = { id: "u1", factors: [{ factor_type: "totp", status: "unverified" }] };
    m.role = { role: "ADMIN" };
    await expect(requireAdminAction()).rejects.toThrow("NEXT_REDIRECT:/mfa/setup");
  });

  it("sends an administrator who has not typed the code to /mfa", async () => {
    m.user = { id: "u1", factors: VERIFIED_TOTP };
    m.role = { role: "ADMIN" };
    await expect(requireAdminAction()).rejects.toThrow(/^NEXT_REDIRECT:\/mfa$/);
  });

  it("sends to /mfa too when the assurance level cannot be read", async () => {
    m.user = { id: "u1", factors: VERIFIED_TOTP };
    m.role = { role: "ADMIN" };
    m.assurance = { data: { currentLevel: "aal2" }, error: new Error("boom") };
    await expect(requireAdminAction()).rejects.toThrow(/^NEXT_REDIRECT:\/mfa$/);
  });

  it("lets an administrator past the TOTP step through", async () => {
    m.user = { id: "u1", email: "admin@x.fr", factors: VERIFIED_TOTP };
    m.role = { role: "ADMIN" };
    m.assurance = { data: { currentLevel: "aal2" }, error: null };
    await expect(requireAdminAction()).resolves.toEqual({
      id: "u1",
      email: "admin@x.fr",
      role: "ADMIN",
    });
    expect(findRoleById).toHaveBeenCalledWith("u1");
    // Its verified factors, compared with the ones the console pinned.
    expect(checkPins).toHaveBeenCalledWith("u1", ["f1"]);
  });

  it("pins the factors of an administrator the console sees for the first time", async () => {
    m.user = { id: "u1", factors: VERIFIED_TOTP };
    m.role = { role: "ADMIN" };
    m.assurance = { data: { currentLevel: "aal2" }, error: null };
    checkPins.mockResolvedValue("pin");
    await expect(requireAdminAction()).resolves.toMatchObject({ id: "u1" });
  });

  it("shuts the console when the factors changed outside it, even past the TOTP step", async () => {
    m.user = {
      id: "u1",
      factors: [
        ...VERIFIED_TOTP,
        { id: "f2", factor_type: "totp", status: "verified" },
        { id: "f3", factor_type: "totp", status: "unverified" },
      ],
    };
    m.role = { role: "ADMIN" };
    m.assurance = { data: { currentLevel: "aal2" }, error: null };
    checkPins.mockResolvedValue("changed");
    await expect(requireAdminAction()).rejects.toThrow("NEXT_REDIRECT:/mfa/changed");
    // Only the verified factors are compared: an enrolment never finished is none.
    expect(checkPins).toHaveBeenCalledWith("u1", ["f1", "f2"]);
  });

  it("asks nothing of the pins before the TOTP step is passed", async () => {
    m.user = { id: "u1", factors: VERIFIED_TOTP };
    m.role = { role: "ADMIN" };
    await expect(requireAdminAction()).rejects.toThrow("NEXT_REDIRECT:/mfa");
    expect(checkPins).not.toHaveBeenCalled();
  });
});
