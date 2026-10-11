import { AuthApiError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONFIRMATION_RESENT_MESSAGE,
  EMAIL_NOT_CONFIRMED_MESSAGE,
} from "@cyberlearn/lib/auth/email-confirmation";
import { initialAuthActionState } from "../auth-action-state";

/**
 * The sign-in's "not confirmed" answer and the confirmation resend.
 *
 * The resend sends mail to whatever address the caller types, so what it
 * promises is what must not drift: the rate limit before any call to
 * Supabase, one neutral answer whether or not an account waits, its own
 * sentence when Supabase's mail quota is spent, and a generic one when the
 * service throws.
 */

const m = vi.hoisted(() => ({
  checkAuthRateLimit: vi.fn<(request: { headers: Headers }) => Promise<boolean>>(),
  getSupabaseServerClient: vi.fn(),
  resend: vi.fn(),
  signInWithPassword: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({ checkAuthRateLimit: m.checkAuthRateLimit }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: m.getSupabaseServerClient }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers()),
  cookies: () => Promise.resolve({ get: () => undefined, delete: () => undefined }),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: m.captureException }));
vi.mock("@/lib/env", () => ({ env: { NEXT_PUBLIC_SITE_URL: "https://cyberlearn.fr" } }));
vi.mock("@/lib/auth/password-flow", () => ({ resolveUserPostSignInRoute: vi.fn() }));
vi.mock("@/lib/auth/verify-password", () => ({ verifyCurrentPassword: vi.fn() }));

const { resendConfirmationEmail, signInWithPassword } = await import("../password-auth");

const EMAIL = "alex@example.fr";
// Carries "placeholder", which the secrets scan knows is not a credential.
const PASSWORD = "placeholder-password-2026";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.append(name, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.checkAuthRateLimit.mockResolvedValue(true);
  m.resend.mockResolvedValue({ data: {}, error: null });
  m.getSupabaseServerClient.mockResolvedValue({
    auth: { resend: m.resend, signInWithPassword: m.signInWithPassword },
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

  it("checks the rate limit before Supabase is asked anything", async () => {
    m.checkAuthRateLimit.mockResolvedValue(false);
    const state = await resendConfirmationEmail(initialAuthActionState, form({ email: EMAIL }));
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

  it("keeps the generic answer for wrong credentials", async () => {
    m.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthApiError("Invalid login credentials", 400, "invalid_credentials"),
    });
    expect(await signIn()).toEqual({
      status: "error",
      message: "Adresse e-mail ou mot de passe incorrect.",
      redirectTo: null,
    });
  });

  it("checks the rate limit before the password is tried", async () => {
    m.checkAuthRateLimit.mockResolvedValue(false);
    expect(await signIn()).toMatchObject({
      status: "error",
      message: "Trop de tentatives. Réessaie dans 15 minutes.",
    });
    expect(m.signInWithPassword).not.toHaveBeenCalled();
  });
});
