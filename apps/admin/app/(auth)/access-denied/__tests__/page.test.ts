import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /access-denied, where requireAdminAction and both TOTP screens send a
 * session whose account is not ADMIN. It is the only way out for such a
 * session, so it must render for it and hand it the sign-out button; anybody
 * else has somewhere better to be, and must not bounce back here.
 */

/** What the mocked Supabase client and users table report. Set per test. */
interface MockState {
  user: { id: string; email?: string } | null;
  role: { role: string } | null;
}
const m = vi.hoisted((): MockState => ({ user: null, role: null }));
const findRoleById = vi.hoisted(() => vi.fn());
const learnerSiteUrl = vi.hoisted(() => vi.fn<() => string>());
const CancelSignIn = vi.hoisted(() =>
  vi.fn<(props: { label?: string; className?: string }) => null>(() => null),
);
const AdminAuthShell = vi.hoisted(() =>
  vi.fn((props: { title: string; children: React.ReactNode }) => props.children),
);

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
      auth: { getUser: () => Promise.resolve({ data: { user: m.user }, error: null }) },
    }),
}));
vi.mock("@/lib/learner-url", () => ({ learnerSiteUrl }));
vi.mock("@cyberlearn/lib/logger", () => ({
  logger: { error: vi.fn() },
  errorMessage: (error: unknown) => String(error),
}));
vi.mock("../../auth-shell", () => ({ AdminAuthShell }));
vi.mock("../../mfa/cancel-sign-in", () => ({ CancelSignIn }));

const { default: AccessDeniedPage } = await import("../page");

/** The page's markup, with the shell reduced to its children. */
async function render(): Promise<string> {
  return renderToStaticMarkup(await AccessDeniedPage());
}

beforeEach(() => {
  m.user = null;
  m.role = null;
  findRoleById.mockReset();
  findRoleById.mockImplementation(() => Promise.resolve(m.role));
  learnerSiteUrl.mockReset();
  learnerSiteUrl.mockReturnValue("https://cyberlearn.fr");
  CancelSignIn.mockClear();
  AdminAuthShell.mockClear();
});

describe("/access-denied", () => {
  it("sends a request without a session to the sign-in page", async () => {
    await expect(AccessDeniedPage()).rejects.toThrow(/^NEXT_REDIRECT:\/login$/);
    expect(findRoleById).not.toHaveBeenCalled();
  });

  it("sends an administrator to the dashboard, not round again", async () => {
    m.user = { id: "u1", email: "admin@x.fr" };
    m.role = { role: "ADMIN" };
    await expect(AccessDeniedPage()).rejects.toThrow(/^NEXT_REDIRECT:\/dashboard$/);
    expect(findRoleById).toHaveBeenCalledWith("u1");
  });

  it("tells any other account the console is not theirs and offers to sign out", async () => {
    m.user = { id: "u1", email: "learner@x.fr" };
    m.role = { role: "STUDENT" };
    const html = await render();

    expect(AdminAuthShell.mock.lastCall?.[0].title).toBe("Accès réservé aux administrateurs");
    expect(CancelSignIn).toHaveBeenCalledTimes(1);
    expect(CancelSignIn.mock.lastCall?.[0].label).toBe("Se déconnecter");
    expect(html).toContain("Compte connecté : learner@x.fr");
    expect(html).toContain('href="https://cyberlearn.fr"');
  });

  it("treats an account without a profile row as not ADMIN", async () => {
    m.user = { id: "u1" };
    m.role = null;
    const html = await render();

    expect(CancelSignIn.mock.lastCall?.[0].label).toBe("Se déconnecter");
    expect(html).not.toContain("Compte connecté");
  });

  it("keeps the sign-out button when the learner site's address is misconfigured", async () => {
    m.user = { id: "u1", email: "teacher@x.fr" };
    m.role = { role: "TEACHER" };
    learnerSiteUrl.mockImplementation(() => {
      throw new Error("NEXT_PUBLIC_SITE_URL points at the admin console");
    });
    const html = await render();

    expect(CancelSignIn).toHaveBeenCalledTimes(1);
    expect(html).not.toContain("Aller sur le site");
  });
});
