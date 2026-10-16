import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /reset-password without the recovery grant. The form would ask for the
 * current password - the one that was forgotten - with no field to type it,
 * and /forgot-password sends a signed-in account to its dashboard: the only
 * way out was to find "Se déconnecter" and start again.
 */

const m = vi.hoisted(() => ({
  getUser: vi.fn(),
  grant: undefined as string | undefined,
  ResetPasswordForm: vi.fn(() => null),
  RestartRecovery: vi.fn<(props: { message: string }) => null>(() => null),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => Promise.resolve({ auth: { getUser: m.getUser } }),
}));
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        name === "cl-pwd-recovery" && m.grant !== undefined ? { value: m.grant } : undefined,
    }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock("../../_components/auth-shell", () => ({
  AuthShell: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("../reset-password-form", () => ({ ResetPasswordForm: m.ResetPasswordForm }));
vi.mock("../restart-recovery", () => ({ RestartRecovery: m.RestartRecovery }));

const { default: ResetPasswordPage } = await import("../page");

beforeEach(() => {
  vi.clearAllMocks();
  m.grant = undefined;
  m.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

describe("/reset-password", () => {
  it("shows the form while the recovery window is open", async () => {
    m.grant = "1";
    renderToStaticMarkup(await ResetPasswordPage());
    expect(m.ResetPasswordForm).toHaveBeenCalled();
    expect(m.RestartRecovery).not.toHaveBeenCalled();
  });

  it("says the window has closed and offers a new link once it has", async () => {
    renderToStaticMarkup(await ResetPasswordPage());
    expect(m.ResetPasswordForm).not.toHaveBeenCalled();
    expect(m.RestartRecovery.mock.lastCall?.[0].message).toContain("Demande un nouveau lien");
  });

  it("still sends a visitor without a session to « Mot de passe oublié »", async () => {
    m.getUser.mockResolvedValue({ data: { user: null } });
    await expect(ResetPasswordPage()).rejects.toThrow("REDIRECT /forgot-password");
  });
});
