import { AuthApiError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONFIRMATION_RESENT_MESSAGE,
  EMAIL_NOT_CONFIRMED_MESSAGE,
} from "@cyberlearn/lib/auth/email-confirmation";
import { initialAuthActionState } from "../auth-action-state";

/**
 * The auth actions: sign-in, sign-up, the confirmation resend and the reset
 * form.
 *
 * The resend sends mail to whatever address the caller types, so what it
 * promises is what must not drift: the rate limit before any call to
 * Supabase, one neutral answer whether or not an account waits, its own
 * sentence when Supabase's mail quota is spent, and a generic one when the
 * service throws.
 *
 * Each action spends from its own budget, keyed on the address; a sign-in
 * adds to the network's only when the password is refused. A refused form
 * hands the address back, never a password, since React empties the form
 * once the action ran.
 * The reset form past its 15 minutes says so and offers a new link.
 */

const m = vi.hoisted(() => ({
  allowAuthAttempt:
    vi.fn<(action: string, request: { headers: Headers }, email: string) => Promise<boolean>>(),
  recordSignInFailure: vi.fn<(request: { headers: Headers }, email: string) => Promise<void>>(),
  getSupabaseServerClient: vi.fn(),
  resend: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
  resolveUserPostSignInRoute: vi.fn(),
  captureException: vi.fn(),
  cookieValue: undefined as string | undefined,
  deleteCookie: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  allowAuthAttempt: m.allowAuthAttempt,
  recordSignInFailure: m.recordSignInFailure,
}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: m.getSupabaseServerClient }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers()),
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        name === "cl-pwd-recovery" && m.cookieValue !== undefined
          ? { value: m.cookieValue }
          : undefined,
      delete: m.deleteCookie,
    }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: m.captureException }));
vi.mock("@/lib/env", () => ({ env: { NEXT_PUBLIC_SITE_URL: "https://cyberlearn.fr" } }));
vi.mock("@/lib/auth/password-flow", () => ({
  resolveUserPostSignInRoute: m.resolveUserPostSignInRoute,
}));
vi.mock("@/lib/auth/verify-password", () => ({ verifyCurrentPassword: vi.fn() }));

const {
  resendConfirmationEmail,
  restartPasswordRecovery,
  signInWithPassword,
  signUpWithPassword,
  updatePassword,
} = await import("../password-auth");

const EMAIL = "alex@example.fr";
// Carries "placeholder", which the secrets scan knows is not a credential.
const PASSWORD = "placeholder-password-2026";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.append(name, value);
  return data;
}

/** What the actions hand the limiter: the request, carrying its headers. */
function aRequest(): { headers: Headers } {
  // SAFETY: Vitest asymmetric matchers, typed `any`; this one matches any
  // object whose `headers` is a Headers instance.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- expect.* returns any; the cast types it for the caller, and dropping it trips no-unsafe-*.
  return expect.objectContaining({ headers: expect.any(Headers) as unknown }) as unknown as {
    headers: Headers;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  m.cookieValue = undefined;
  m.allowAuthAttempt.mockResolvedValue(true);
  m.recordSignInFailure.mockResolvedValue(undefined);
  m.resend.mockResolvedValue({ data: {}, error: null });
  m.signUp.mockResolvedValue({ data: {}, error: null });
  m.signOut.mockResolvedValue({ error: null });
  m.getUser.mockResolvedValue({ data: { user: { id: "user-1", email: EMAIL } } });
  m.updateUser.mockResolvedValue({ data: {}, error: null });
  m.getAuthenticatorAssuranceLevel.mockResolvedValue({
    data: { currentLevel: "aal1", nextLevel: "aal1" },
    error: null,
  });
  m.getSupabaseServerClient.mockResolvedValue({
    auth: {
      resend: m.resend,
      signInWithPassword: m.signInWithPassword,
      signUp: m.signUp,
      signOut: m.signOut,
      getUser: m.getUser,
      updateUser: m.updateUser,
      mfa: { getAuthenticatorAssuranceLevel: m.getAuthenticatorAssuranceLevel },
    },
  });
});

describe("resendConfirmationEmail", () => {
  it("refuses an invalid address without calling Supabase", async () => {
    const state = await resendConfirmationEmail(
      initialAuthActionState,
      form({ email: "not-an-address" }),
    );
    expect(state).toMatchObject({ status: "error", message: "Adresse e-mail invalide." });
    expect(m.getSupabaseServerClient).not.toHaveBeenCalled();
    expect(m.resend).not.toHaveBeenCalled();
  });

  it("checks its own budget for the address before Supabase is asked anything", async () => {
    m.allowAuthAttempt.mockResolvedValue(false);
    const state = await resendConfirmationEmail(initialAuthActionState, form({ email: EMAIL }));
    expect(m.allowAuthAttempt).toHaveBeenCalledWith("resend-confirmation", aRequest(), EMAIL);
    expect(state).toMatchObject({
      status: "error",
      message: "Trop de demandes. Réessaie dans 15 minutes.",
      email: EMAIL,
    });
    expect(m.getSupabaseServerClient).not.toHaveBeenCalled();
    expect(m.resend).not.toHaveBeenCalled();
  });

  it("sends the sign-up mail again, back to the onboarding", async () => {
    const state = await resendConfirmationEmail(
      initialAuthActionState,
      form({ email: " Alex@Example.fr " }),
    );
    expect(m.resend).toHaveBeenCalledWith({
      type: "signup",
      email: EMAIL,
      options: { emailRedirectTo: "https://cyberlearn.fr/auth/callback?next=/onboarding" },
    });
    expect(state).toEqual({
      status: "check_email",
      message: CONFIRMATION_RESENT_MESSAGE,
      redirectTo: null,
      email: EMAIL,
    });
  });

  it.each([
    [
      "an address already confirmed",
      new AuthApiError("Email address already confirmed", 400, undefined),
    ],
    ["an address without an account", new AuthApiError("User not found", 404, "user_not_found")],
  ])("gives the same neutral answer for %s", async (_case, error) => {
    m.resend.mockResolvedValue({ data: {}, error });
    const state = await resendConfirmationEmail(initialAuthActionState, form({ email: EMAIL }));
    expect(state).toEqual({
      status: "check_email",
      message: CONFIRMATION_RESENT_MESSAGE,
      redirectTo: null,
      email: EMAIL,
    });
  });

  it.each([
    ["its code", new AuthApiError("Email rate limit exceeded", 429, "over_email_send_rate_limit")],
    ["a 429", new AuthApiError("Too many requests", 429, undefined)],
  ])(
    "says the mail service is saturated when Supabase's quota is spent, by %s",
    async (_case, error) => {
      m.resend.mockResolvedValue({ data: {}, error });
      const state = await resendConfirmationEmail(initialAuthActionState, form({ email: EMAIL }));
      expect(state).toMatchObject({
        status: "error",
        message: "Le service d’e-mail est temporairement saturé. Réessaie dans quelques minutes.",
        email: EMAIL,
      });
    },
  );

  it("answers with a generic sentence when the service throws", async () => {
    m.resend.mockRejectedValue(new Error("fetch failed"));
    const state = await resendConfirmationEmail(initialAuthActionState, form({ email: EMAIL }));
    expect(state).toMatchObject({
      status: "error",
      message: "Le service d’e-mail est indisponible. Réessaie dans quelques minutes.",
      email: EMAIL,
    });
    expect(m.captureException).toHaveBeenCalledOnce();
  });
});

describe("signInWithPassword", () => {
  function signIn(): ReturnType<typeof signInWithPassword> {
    return signInWithPassword(initialAuthActionState, form({ email: EMAIL, password: PASSWORD }));
  }

  it("tells an unconfirmed address apart, with the address to send the mail again to", async () => {
    m.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthApiError("Email not confirmed", 400, "email_not_confirmed"),
    });
    expect(await signIn()).toEqual({
      status: "unconfirmed",
      message: EMAIL_NOT_CONFIRMED_MESSAGE,
      redirectTo: null,
      email: EMAIL,
    });
  });

  it("keeps the generic answer for wrong credentials, with the address to put back", async () => {
    m.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthApiError("Invalid login credentials", 400, "invalid_credentials"),
    });
    expect(await signIn()).toEqual({
      status: "error",
      message: "Adresse e-mail ou mot de passe incorrect.",
      redirectTo: null,
      email: EMAIL,
    });
  });

  it("hands back the address typed when the form is refused", async () => {
    const state = await signInWithPassword(
      initialAuthActionState,
      form({ email: "alex@", password: "" }),
    );
    expect(state).toMatchObject({ status: "error", email: "alex@" });
    expect(m.signInWithPassword).not.toHaveBeenCalled();
  });

  it("checks the sign-in budget of the address before the password is tried", async () => {
    m.allowAuthAttempt.mockResolvedValue(false);
    expect(await signIn()).toMatchObject({
      status: "error",
      message: "Trop de tentatives. Réessaie dans 15 minutes.",
      email: EMAIL,
    });
    expect(m.allowAuthAttempt).toHaveBeenCalledWith("sign-in", aRequest(), EMAIL);
    expect(m.signInWithPassword).not.toHaveBeenCalled();
  });

  it("counts a refused password against the network", async () => {
    m.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthApiError("Invalid login credentials", 400, "invalid_credentials"),
    });
    await signIn();
    expect(m.recordSignInFailure).toHaveBeenCalledWith(aRequest(), EMAIL);
  });

  it("counts nothing for a password that matched", async () => {
    m.signInWithPassword.mockResolvedValue({
      data: { user: { id: "user-1" }, session: {} },
      error: null,
    });
    m.resolveUserPostSignInRoute.mockResolvedValue("/dashboard");
    expect(await signIn()).toMatchObject({ status: "success", redirectTo: "/dashboard" });
    expect(m.recordSignInFailure).not.toHaveBeenCalled();
  });

  it("counts nothing for an unconfirmed address, whose password matched", async () => {
    m.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthApiError("Email not confirmed", 400, "email_not_confirmed"),
    });
    await signIn();
    expect(m.recordSignInFailure).not.toHaveBeenCalled();
  });

  it("counts nothing when Supabase itself fails", async () => {
    m.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthApiError("Internal error", 500, "unexpected_failure"),
    });
    await signIn();
    expect(m.recordSignInFailure).not.toHaveBeenCalled();
  });
});

describe("signUpWithPassword", () => {
  function signUp(): ReturnType<typeof signUpWithPassword> {
    return signUpWithPassword(
      initialAuthActionState,
      form({ email: EMAIL, password: PASSWORD, passwordConfirmation: PASSWORD }),
    );
  }

  it("checks the sign-up budget of the address, apart from the others", async () => {
    m.allowAuthAttempt.mockResolvedValue(false);
    expect(await signUp()).toMatchObject({ status: "error", email: EMAIL });
    expect(m.allowAuthAttempt).toHaveBeenCalledWith("sign-up", aRequest(), EMAIL);
    expect(m.signUp).not.toHaveBeenCalled();
  });

  it("hands back the address, never the password, when the form is refused", async () => {
    const state = await signUpWithPassword(
      initialAuthActionState,
      form({ email: EMAIL, password: "short", passwordConfirmation: "short" }),
    );
    expect(state).toMatchObject({ status: "error", email: EMAIL });
    expect(JSON.stringify(state)).not.toContain("short");
  });

  it("hands back the address when Supabase refuses it", async () => {
    m.signUp.mockResolvedValue({
      data: {},
      error: new AuthApiError("Email address is invalid", 400, "email_address_invalid"),
    });
    expect(await signUp()).toMatchObject({ status: "error", email: EMAIL });
  });
});

describe("updatePassword, from the reset form", () => {
  function reset(fields: Record<string, string> = {}): ReturnType<typeof updatePassword> {
    return updatePassword(
      initialAuthActionState,
      form({ intent: "recovery", password: PASSWORD, passwordConfirmation: PASSWORD, ...fields }),
    );
  }

  it("sets the new password while the recovery window is open", async () => {
    m.cookieValue = "1";
    expect(await reset()).toMatchObject({ status: "success" });
    expect(m.updateUser).toHaveBeenCalledWith({ password: PASSWORD });
    expect(m.deleteCookie).toHaveBeenCalledWith("cl-pwd-recovery");
  });

  it("says the window has closed rather than ask for a password it has no field for", async () => {
    const state = await reset();
    expect(state).toEqual({
      status: "recovery_expired",
      message:
        "Le délai de 15 minutes pour choisir un nouveau mot de passe est passé. Demande un nouveau lien de réinitialisation.",
      redirectTo: null,
    });
    expect(m.updateUser).not.toHaveBeenCalled();
  });

  it("still asks the settings form for the current password", async () => {
    const state = await updatePassword(
      initialAuthActionState,
      form({ password: PASSWORD, passwordConfirmation: PASSWORD }),
    );
    expect(state).toMatchObject({
      status: "error",
      message: "Saisis ton mot de passe actuel pour confirmer le changement.",
    });
    expect(m.updateUser).not.toHaveBeenCalled();
  });
});

describe("restartPasswordRecovery", () => {
  it("signs out, drops the grant and goes back to « Mot de passe oublié »", async () => {
    await expect(restartPasswordRecovery()).rejects.toThrow("REDIRECT /forgot-password");
    expect(m.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(m.deleteCookie).toHaveBeenCalledWith("cl-pwd-recovery");
  });

  it("still goes there when signing out throws", async () => {
    m.signOut.mockRejectedValue(new Error("fetch failed"));
    await expect(restartPasswordRecovery()).rejects.toThrow("REDIRECT /forgot-password");
    expect(m.captureException).toHaveBeenCalledOnce();
  });
});
