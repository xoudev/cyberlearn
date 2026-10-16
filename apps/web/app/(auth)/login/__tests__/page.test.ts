import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /login?error= is a link anybody can write. Looked up as it came on a plain
 * object, `?error=toString` found a function, no fallback caught it, and the
 * client form could not be handed it: the page failed to render.
 */

const LoginForm = vi.hoisted(() =>
  vi.fn<
    (props: {
      initialError: string | null;
      initialErrorLink: { href: string; label: string } | null;
    }) => null
  >(() => null),
);
vi.mock("../login-form", () => ({ LoginForm }));
vi.mock("../../_components/auth-shell", () => ({
  AuthShell: ({ children }: { children: React.ReactNode }) => children,
}));

const { default: LoginPage } = await import("../page");

const GENERIC = "La connexion a échoué.";

/** What the sign-in form is handed as its first error for `?error=`. */
async function initialErrorFor(error?: string | string[]): Promise<unknown> {
  const searchParams = Promise.resolve(error === undefined ? {} : { error });
  renderToStaticMarkup(await LoginPage({ searchParams }));
  return LoginForm.mock.lastCall?.[0].initialError;
}

beforeEach(() => {
  LoginForm.mockClear();
});

describe("/login?error=", () => {
  it("says nothing without a code", async () => {
    expect(await initialErrorFor()).toBeNull();
    expect(await initialErrorFor("")).toBeNull();
  });

  it("explains the codes the auth routes write", async () => {
    expect(await initialErrorFor("auth_failed")).toBe(
      "Le lien de connexion a expiré ou n’est plus valide.",
    );
    expect(await initialErrorFor("rate_limited")).toBe(
      "Trop de tentatives. Réessaie dans 15 minutes.",
    );
  });

  it("explains a link that arrived cut short, instead of the generic line", async () => {
    expect(await initialErrorFor("missing_token")).toBe(
      "Ce lien est incomplet : copie-le en entier depuis l’e-mail, ou demande-en un nouveau.",
    );
  });

  it("tells a spent reset link from a sign-in link, and offers a new one", async () => {
    expect(await initialErrorFor("recovery_expired")).toBe(
      "Ce lien de réinitialisation a expiré ou a déjà servi. Demande un nouveau lien.",
    );
    expect(LoginForm.mock.lastCall?.[0].initialErrorLink).toEqual({
      href: "/forgot-password",
      label: "Demander un nouveau lien",
    });
  });

  it("offers no link where there is nowhere to go", async () => {
    await initialErrorFor("auth_failed");
    expect(LoginForm.mock.lastCall?.[0].initialErrorLink).toBeNull();
    await initialErrorFor("toString");
    expect(LoginForm.mock.lastCall?.[0].initialErrorLink).toBeNull();
  });

  it("gives the generic line for a code nobody wrote", async () => {
    expect(await initialErrorFor("not_a_code")).toBe(GENERIC);
    expect(await initialErrorFor(["auth_failed", "no_user"])).toBe(GENERIC);
  });

  it("hands the form a sentence, not what an object's prototype holds", async () => {
    for (const key of ["toString", "constructor", "hasOwnProperty", "__proto__"]) {
      expect(await initialErrorFor(key)).toBe(GENERIC);
    }
  });
});
