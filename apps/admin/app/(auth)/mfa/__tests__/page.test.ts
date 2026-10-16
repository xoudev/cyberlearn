import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /mfa and /mfa/setup, the two TOTP screens. A session whose account is not
 * ADMIN used to get notFound() from both, with no page left that would sign
 * it out. It is sent to the access-denied screen now, before anything asks
 * Supabase about factors it has no use for. An administrator still goes
 * through the TOTP step as before.
 */

/** What the mocked Supabase client and users table report. Set per test. */
interface MockState {
  user: { id: string } | null;
  role: { role: string } | null;
  totp: { id: string }[];
  currentLevel: string;
}
const m = vi.hoisted((): MockState => ({ user: null, role: null, totp: [], currentLevel: "aal1" }));
const findRoleById = vi.hoisted(() => vi.fn());
const listFactors = vi.hoisted(() => vi.fn());
const getAuthenticatorAssuranceLevel = vi.hoisted(() => vi.fn());
const AdminMfaChallenge = vi.hoisted(() => vi.fn<(props: { next: string }) => null>(() => null));
const AdminMfaSetup = vi.hoisted(() => vi.fn<(props: { next: string }) => null>(() => null));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
  notFound: () => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  },
}));
vi.mock("@cyberlearn/db", () => ({ userRepository: { findRoleById } }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () =>
    Promise.resolve({
      auth: {
        getUser: () => Promise.resolve({ data: { user: m.user }, error: null }),
        mfa: { listFactors, getAuthenticatorAssuranceLevel },
      },
    }),
}));
vi.mock("../../auth-shell", () => ({
  AdminAuthShell: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("../admin-mfa-challenge", () => ({ AdminMfaChallenge }));
vi.mock("../setup/admin-mfa-setup", () => ({ AdminMfaSetup }));

const { default: AdminMfaPage } = await import("../page");
const { default: AdminMfaSetupPage } = await import("../setup/page");

type Page = typeof AdminMfaPage;

/** The page for `?next=`, rendered; a redirect rejects with its target. */
async function visit(page: Page, next?: string): Promise<string> {
  const searchParams = Promise.resolve(next === undefined ? {} : { next });
  return renderToStaticMarkup(await page({ searchParams }));
}

beforeEach(() => {
  m.user = null;
  m.role = null;
  m.totp = [];
  m.currentLevel = "aal1";
  findRoleById.mockReset();
  findRoleById.mockImplementation(() => Promise.resolve(m.role));
  listFactors.mockReset();
  listFactors.mockImplementation(() =>
    Promise.resolve({ data: { totp: m.totp, all: m.totp }, error: null }),
  );
  getAuthenticatorAssuranceLevel.mockReset();
  getAuthenticatorAssuranceLevel.mockImplementation(() =>
    Promise.resolve({ data: { currentLevel: m.currentLevel }, error: null }),
  );
  AdminMfaChallenge.mockClear();
  AdminMfaSetup.mockClear();
});

describe.each([
  ["/mfa", AdminMfaPage],
  ["/mfa/setup", AdminMfaSetupPage],
])("%s", (_path, page) => {
  it("sends a request without a session to sign in, keeping the destination", async () => {
    await expect(visit(page, "/users")).rejects.toThrow(
      /^NEXT_REDIRECT:\/login\?redirectTo=%2Fusers$/,
    );
    expect(findRoleById).not.toHaveBeenCalled();
  });

  it.each([["STUDENT"], ["TEACHER"]])(
    "sends a %s account to the access-denied screen, without asking for factors",
    async (role) => {
      m.user = { id: "u1" };
      m.role = { role };
      await expect(visit(page)).rejects.toThrow(/^NEXT_REDIRECT:\/access-denied$/);
      expect(findRoleById).toHaveBeenCalledWith("u1");
      expect(listFactors).not.toHaveBeenCalled();
    },
  );

  it("treats an account without a profile row as not ADMIN", async () => {
    m.user = { id: "u1" };
    m.role = null;
    await expect(visit(page)).rejects.toThrow(/^NEXT_REDIRECT:\/access-denied$/);
    expect(listFactors).not.toHaveBeenCalled();
  });
});

describe("/mfa for an administrator", () => {
  beforeEach(() => {
    m.user = { id: "u1" };
    m.role = { role: "ADMIN" };
  });

  it("asks for the code of the factor enrolled", async () => {
    m.totp = [{ id: "f1" }];
    await visit(AdminMfaPage, "/tickets/t1");
    expect(AdminMfaChallenge.mock.lastCall?.[0].next).toBe("/tickets/t1");
  });

  it("sends an administrator without a factor to enrol one", async () => {
    await expect(visit(AdminMfaPage, "/users")).rejects.toThrow(
      /^NEXT_REDIRECT:\/mfa\/setup\?next=%2Fusers$/,
    );
  });

  it("goes on to the destination once the code is typed", async () => {
    m.totp = [{ id: "f1" }];
    m.currentLevel = "aal2";
    await expect(visit(AdminMfaPage, "/users")).rejects.toThrow(/^NEXT_REDIRECT:\/users$/);
  });
});

describe("/mfa/setup for an administrator", () => {
  beforeEach(() => {
    m.user = { id: "u1" };
    m.role = { role: "ADMIN" };
  });

  it("shows the enrolment form to an administrator without a factor", async () => {
    await visit(AdminMfaSetupPage, "/users");
    expect(AdminMfaSetup.mock.lastCall?.[0].next).toBe("/users");
  });

  it("sends an administrator with a factor to type its code", async () => {
    m.totp = [{ id: "f1" }];
    await expect(visit(AdminMfaSetupPage, "/users")).rejects.toThrow(
      /^NEXT_REDIRECT:\/mfa\?next=%2Fusers$/,
    );
  });
});
