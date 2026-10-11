import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /login?error= is a link anybody can write. The page used to look the value
 * up on a plain object, so `?error=toString` found a function, no fallback
 * caught it, and the client form could not be handed it: the only way into
 * the console rendered the error page instead.
 */

const AdminLoginForm = vi.hoisted(() =>
  vi.fn<(props: { initialError: string | null }) => null>(() => null),
);
vi.mock("../login-form", () => ({ AdminLoginForm }));
vi.mock("../../auth-shell", () => ({
  AdminAuthShell: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/lib/learner-url", () => ({
  learnerUrl: (path: string) => `https://cyberlearn.fr${path}`,
}));

const { default: AdminLoginPage } = await import("../page");

const GENERIC = "La connexion a échoué. Réessaie.";

/** What the sign-in form is handed as its first error for `?error=`. */
async function initialErrorFor(error?: string | string[]): Promise<unknown> {
  const searchParams = Promise.resolve(error === undefined ? {} : { error });
  renderToStaticMarkup(await AdminLoginPage({ searchParams }));
  return AdminLoginForm.mock.lastCall?.[0].initialError;
}

beforeEach(() => {
  AdminLoginForm.mockClear();
});

describe("/login?error=", () => {
  it("says nothing without a code", async () => {
    expect(await initialErrorFor()).toBeNull();
    expect(await initialErrorFor("")).toBeNull();
  });

  it("explains the codes the middleware writes", async () => {
    expect(await initialErrorFor("session_expired")).toBe(
      "Ta session a expiré. Reconnecte-toi pour reprendre où tu en étais.",
    );
    expect(await initialErrorFor("auth_unavailable")).toBe(
      "Le service d'authentification ne répond pas. Réessaie dans un instant.",
    );
  });

  it("gives the generic line for a code nobody wrote", async () => {
    expect(await initialErrorFor("not_a_code")).toBe(GENERIC);
    expect(await initialErrorFor(["session_expired", "auth_unavailable"])).toBe(GENERIC);
  });

  it("hands the form a sentence, not what an object's prototype holds", async () => {
    for (const key of ["toString", "constructor", "hasOwnProperty", "__proto__"]) {
      expect(await initialErrorFor(key)).toBe(GENERIC);
    }
  });
});
