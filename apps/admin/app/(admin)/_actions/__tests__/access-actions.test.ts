import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn(),
  findConsoleTarget: vi.fn(),
  record: vi.fn<(entry: Record<string, unknown>) => Promise<void>>(),
  revalidatePath: vi.fn(),
  getUserById: vi.fn(),
  updateUserById: vi.fn(),
  listFactors: vi.fn(),
  deleteFactor: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  resend: vi.fn(),
  sendMfaResetEmail: vi.fn<(options: Record<string, unknown>) => Promise<void>>(),
  heldAdminRoleSince: vi.fn(),
  revokeAllSessions: vi.fn<(userId: string, by: { actorId: string }) => Promise<number>>(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  auditLogRepository: { record: m.record },
  userRepository: {
    findConsoleTarget: m.findConsoleTarget,
    heldAdminRoleSince: m.heldAdminRoleSince,
    revokeAllSessions: m.revokeAllSessions,
  },
}));
vi.mock("@cyberlearn/db/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    auth: {
      admin: {
        getUserById: m.getUserById,
        updateUserById: m.updateUserById,
        mfa: { listFactors: m.listFactors, deleteFactor: m.deleteFactor },
      },
      resetPasswordForEmail: m.resetPasswordForEmail,
      resend: m.resend,
    },
  }),
}));
vi.mock("@cyberlearn/email", () => ({ sendMfaResetEmail: m.sendMfaResetEmail }));
vi.mock("@cyberlearn/lib/logger", () => ({
  logger: { error: vi.fn() },
  errorMessage: (error: unknown) => String(error),
}));
// The sender as production has it: a noreply, which must never be the address
// a mail asks its reader to write to.
vi.mock("@/lib/env", () => ({
  env: { RESEND_API_KEY: "re_test", RESEND_FROM_EMAIL: "noreply@cyberlearn.fr" },
}));
vi.mock("@/lib/learner-url", () => ({
  learnerUrl: (path: string) => `https://cyberlearn.fr${path}`,
  learnerSiteUrl: () => "https://cyberlearn.fr",
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));

const { ADMIN_MFA_REFUSAL, RECENT_ADMIN_MFA_REFUSAL } = await import("@/lib/account-guards");
const {
  confirmEmailAction,
  resendConfirmationAction,
  resetMfaAction,
  revokeAllSessionsAction,
  sendPasswordResetAction,
} = await import("../access-actions");

/**
 * The gestures that unblock an account from the console: what they refuse,
 * what they change in Supabase Auth, what they write to the audit log, and
 * that the learner hears about a removed second factor.
 */

const ADMIN = "11111111-1111-4111-8111-111111111111";
const LEARNER = "22222222-2222-4222-8222-222222222222";
const OTHER_ADMIN = "33333333-3333-4333-8333-333333333333";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

/** What the action wrote to the audit log, from its only write there. */
function audited(): Record<string, unknown> | undefined {
  return m.record.mock.calls[0]?.[0];
}

function account(id: string, role: "STUDENT" | "TEACHER" | "ADMIN") {
  return {
    id,
    email: `${id.slice(0, 4)}@exemple.fr`,
    displayName: "Amélie",
    username: "amelie",
    role,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: ADMIN, email: "admin@x.fr", role: "ADMIN" });
  m.findConsoleTarget.mockImplementation((id: string) =>
    Promise.resolve(
      id === LEARNER
        ? account(LEARNER, "STUDENT")
        : id === OTHER_ADMIN
          ? account(OTHER_ADMIN, "ADMIN")
          : id === ADMIN
            ? account(ADMIN, "ADMIN")
            : null,
    ),
  );
  m.record.mockResolvedValue(undefined);
  m.heldAdminRoleSince.mockResolvedValue(false);
  m.listFactors.mockResolvedValue({
    data: {
      factors: [
        { id: "f-1", factor_type: "totp", status: "verified" },
        { id: "f-2", factor_type: "totp", status: "unverified" },
        { id: "f-3", factor_type: "phone", status: "verified" },
      ],
    },
    error: null,
  });
  m.deleteFactor.mockResolvedValue({ data: {}, error: null });
  m.sendMfaResetEmail.mockResolvedValue(undefined);
  m.getUserById.mockResolvedValue({
    data: { user: { email: "2222@exemple.fr", email_confirmed_at: null } },
    error: null,
  });
  m.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  m.resend.mockResolvedValue({ data: {}, error: null });
  m.updateUserById.mockResolvedValue({ data: {}, error: null });
});

describe("resetMfaAction", () => {
  const typed = (id: string) => form({ userId: id, confirmEmail: account(id, "STUDENT").email });

  it("checks the caller is an admin before anything else", async () => {
    m.requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(resetMfaAction({}, typed(LEARNER))).rejects.toThrow("NEXT_REDIRECT");
    expect(m.listFactors).not.toHaveBeenCalled();
  });

  it("refuses on oneself, without asking Supabase anything", async () => {
    const result = await resetMfaAction({}, typed(ADMIN));
    expect(result.error).toMatch(/ta propre double authentification/u);
    expect(m.listFactors).not.toHaveBeenCalled();
    expect(m.deleteFactor).not.toHaveBeenCalled();
    expect(m.record).not.toHaveBeenCalled();
  });

  it("refuses on another administrator and points to the break-glass procedure", async () => {
    const result = await resetMfaAction({}, typed(OTHER_ADMIN));
    expect(result.error).toBe(ADMIN_MFA_REFUSAL);
    expect(m.listFactors).not.toHaveBeenCalled();
    expect(m.deleteFactor).not.toHaveBeenCalled();
  });

  it("refuses on a learner who was an administrator in the last weeks", async () => {
    // Demote, reset, promote back: the log shows the demotion, and the reset
    // stays refused.
    m.heldAdminRoleSince.mockResolvedValue(true);
    const result = await resetMfaAction({}, typed(LEARNER));
    expect(result.error).toBe(RECENT_ADMIN_MFA_REFUSAL);
    expect(m.heldAdminRoleSince).toHaveBeenCalledWith(LEARNER, expect.any(Date));
    expect(m.listFactors).not.toHaveBeenCalled();
    expect(m.deleteFactor).not.toHaveBeenCalled();
  });

  it("refuses when the role history cannot be read, rather than guessing", async () => {
    m.heldAdminRoleSince.mockRejectedValue(new Error("connection reset"));
    const result = await resetMfaAction({}, typed(LEARNER));
    expect(result.error).toMatch(/historique des rôles/u);
    expect(m.deleteFactor).not.toHaveBeenCalled();
  });

  it("refuses when the typed address is not the account's", async () => {
    const result = await resetMfaAction(
      {},
      form({ userId: LEARNER, confirmEmail: "quelquun@exemple.fr" }),
    );
    expect(result.error).toMatch(/ne correspond pas/u);
    expect(m.deleteFactor).not.toHaveBeenCalled();
  });

  it("removes every TOTP factor, logs it, and tells the learner", async () => {
    const result = await resetMfaAction({}, typed(LEARNER));

    expect(m.deleteFactor).toHaveBeenCalledTimes(2);
    expect(m.deleteFactor).toHaveBeenCalledWith({ id: "f-1", userId: LEARNER });
    expect(m.deleteFactor).toHaveBeenCalledWith({ id: "f-2", userId: LEARNER });
    expect(m.record).toHaveBeenCalledWith({
      actorId: ADMIN,
      action: "admin.user.mfa_reset",
      targetType: "User",
      targetId: LEARNER,
      metadata: { factorsFound: 2, factorsRemoved: 2, complete: true },
    });
    expect(m.sendMfaResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: account(LEARNER, "STUDENT").email,
        securityUrl: "https://cyberlearn.fr/settings/account",
        sessionsClosed: true,
        contactUrl:
          "https://cyberlearn.fr/contact?theme=SECURITY&subject=Double+authentification+retir%C3%A9e+sans+ma+demande",
      }),
    );
    expect(result).toMatchObject({ ok: true, emailFailed: false, auditFailed: false });
    // Whatever the sign-in method: a GitHub account has no password.
    expect(result.notice).toMatch(/comme d'habitude, sans code/u);
    expect(result.notice).not.toMatch(/mot de passe/u);
  });

  it("never hands out the sender as the address to write to", async () => {
    // The sender is noreply@ in every documented setup. The owner of an
    // account unlocked behind their back writes to the contact form instead.
    await resetMfaAction({}, typed(LEARNER));
    const { from, ...rest } = m.sendMfaResetEmail.mock.calls[0]?.[0] ?? {};
    expect(from).toBe("noreply@cyberlearn.fr");
    expect(JSON.stringify(rest)).not.toContain("noreply");
  });

  it("reports the reset done when only the audit write fails, and still tells the learner", async () => {
    m.record.mockRejectedValue(new Error("audit_logs unavailable"));
    const result = await resetMfaAction({}, typed(LEARNER));
    expect(result).toMatchObject({ ok: true, auditFailed: true });
    expect(m.sendMfaResetEmail).toHaveBeenCalled();
  });

  it("reports a reset that stopped halfway, logs it, and sends no mail", async () => {
    m.deleteFactor
      .mockResolvedValueOnce({ data: {}, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error("boom") });

    const result = await resetMfaAction({}, typed(LEARNER));

    expect(result.error).toMatch(/1 facteur sur 2/u);
    expect(audited()).toMatchObject({
      metadata: { factorsFound: 2, factorsRemoved: 1, complete: false },
    });
    expect(m.sendMfaResetEmail).not.toHaveBeenCalled();
  });

  it("says so when there is nothing to remove, and writes nothing", async () => {
    m.listFactors.mockResolvedValue({ data: { factors: [] }, error: null });
    const result = await resetMfaAction({}, typed(LEARNER));
    expect(result.error).toMatch(/pas de double authentification/u);
    expect(m.record).not.toHaveBeenCalled();
  });

  it("still succeeds when the mail does not go out, and says it did not", async () => {
    m.sendMfaResetEmail.mockRejectedValue(new Error("resend down"));
    const result = await resetMfaAction({}, typed(LEARNER));
    expect(result).toMatchObject({ ok: true, emailFailed: true });
  });

  describe("an activation that was started and never finished", () => {
    beforeEach(() => {
      m.listFactors.mockResolvedValue({
        data: { factors: [{ id: "f-9", factor_type: "totp", status: "unverified" }] },
        error: null,
      });
    });

    it("is not reset: nothing is removed, nothing is logged, and nobody is told", async () => {
      // The owner never had a second factor. Telling them it was reset, and
      // that "your authenticator no longer serves CyberLearn", would be false,
      // and so would the alert that follows it.
      const result = await resetMfaAction({}, typed(LEARNER));

      expect(result.ok).toBeUndefined();
      expect(result.error).toMatch(/pas de double authentification active/u);
      expect(result.error).toMatch(/Rien n'a été retiré/u);
      expect(m.deleteFactor).not.toHaveBeenCalled();
      expect(m.record).not.toHaveBeenCalled();
      expect(m.sendMfaResetEmail).not.toHaveBeenCalled();
      expect(m.revalidatePath).not.toHaveBeenCalled();
    });

    it("is removed along with a finished factor, which is what the reset is for", async () => {
      m.listFactors.mockResolvedValue({
        data: {
          factors: [
            { id: "f-9", factor_type: "totp", status: "unverified" },
            { id: "f-1", factor_type: "totp", status: "verified" },
          ],
        },
        error: null,
      });

      const result = await resetMfaAction({}, typed(LEARNER));

      expect(result).toMatchObject({ ok: true });
      expect(m.deleteFactor).toHaveBeenCalledTimes(2);
      expect(m.sendMfaResetEmail).toHaveBeenCalledWith(
        expect.objectContaining({ sessionsClosed: true }),
      );
    });
  });
});

describe("revokeAllSessionsAction", () => {
  beforeEach(() => {
    m.revokeAllSessions.mockResolvedValue(2);
  });

  it("checks the caller is an admin before anything else", async () => {
    m.requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(revokeAllSessionsAction({}, form({ userId: LEARNER }))).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(m.revokeAllSessions).not.toHaveBeenCalled();
  });

  it("closes the account's sessions as the administrator, and says how many went", async () => {
    const result = await revokeAllSessionsAction({}, form({ userId: LEARNER }));
    expect(m.revokeAllSessions).toHaveBeenCalledWith(LEARNER, { actorId: ADMIN });
    expect(result.ok).toBe(true);
    expect(result.notice).toMatch(/^2 sessions fermées\./u);
  });

  it("says so when nothing was open", async () => {
    m.revokeAllSessions.mockResolvedValue(0);
    const result = await revokeAllSessionsAction({}, form({ userId: LEARNER }));
    expect(result).toMatchObject({
      ok: true,
      notice: "Aucune session n'était ouverte sur ce compte.",
    });
  });

  it("refuses on oneself, whose session is one of them", async () => {
    const result = await revokeAllSessionsAction({}, form({ userId: ADMIN }));
    expect(result.error).toMatch(/tes propres sessions/u);
    expect(m.revokeAllSessions).not.toHaveBeenCalled();
  });

  it("refuses an account that is gone, and an id that is not one", async () => {
    const gone = "55555555-5555-4555-8555-555555555555";
    expect((await revokeAllSessionsAction({}, form({ userId: gone }))).error).toBe(
      "Ce compte n'existe plus.",
    );
    expect((await revokeAllSessionsAction({}, form({ userId: "nope" }))).error).toBe(
      "Paramètres invalides.",
    );
    expect(m.revokeAllSessions).not.toHaveBeenCalled();
  });

  it("reports a failure as nothing closed, rather than a crash", async () => {
    m.revokeAllSessions.mockRejectedValue(new Error("permission denied for table sessions"));
    const result = await revokeAllSessionsAction({}, form({ userId: LEARNER }));
    expect(result.error).toMatch(/Aucune session n'a été fermée/u);
  });
});

describe("sendPasswordResetAction", () => {
  it("sends the self-service recovery mail to the auth address, and logs it", async () => {
    const result = await sendPasswordResetAction({}, form({ userId: LEARNER }));
    expect(m.resetPasswordForEmail).toHaveBeenCalledWith("2222@exemple.fr", {
      redirectTo: "https://cyberlearn.fr/auth/callback?next=/reset-password",
    });
    expect(audited()).toMatchObject({ action: "admin.user.password_reset_sent" });
    expect(result.ok).toBe(true);
  });

  it("reports the link sent when only the audit write fails", async () => {
    m.record.mockRejectedValue(new Error("audit_logs unavailable"));
    const result = await sendPasswordResetAction({}, form({ userId: LEARNER }));
    expect(result).toMatchObject({ ok: true, auditFailed: true });
    expect(result.notice).toMatch(/envoyé à 2222@exemple\.fr/u);
  });

  it("asks to wait when Supabase rate-limits the address, and logs nothing", async () => {
    m.resetPasswordForEmail.mockResolvedValue({ data: null, error: { status: 429 } });
    const result = await sendPasswordResetAction({}, form({ userId: LEARNER }));
    expect(result.error).toMatch(/moins d'une minute/u);
    expect(m.record).not.toHaveBeenCalled();
  });

  it("refuses an id that is not a uuid", async () => {
    const result = await sendPasswordResetAction({}, form({ userId: "nope" }));
    expect(result.error).toBe("Paramètres invalides.");
    expect(m.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});

describe("address confirmation", () => {
  it("resends the sign-up mail to an address not yet confirmed", async () => {
    const result = await resendConfirmationAction({}, form({ userId: LEARNER }));
    expect(m.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "2222@exemple.fr",
      options: { emailRedirectTo: "https://cyberlearn.fr/auth/callback?next=/onboarding" },
    });
    expect(result.ok).toBe(true);
  });

  it("reports the mail resent when only the audit write fails", async () => {
    m.record.mockRejectedValue(new Error("audit_logs unavailable"));
    const result = await resendConfirmationAction({}, form({ userId: LEARNER }));
    expect(result).toMatchObject({ ok: true, auditFailed: true });
  });

  it("does nothing for an address already confirmed", async () => {
    m.getUserById.mockResolvedValue({
      data: { user: { email: "2222@exemple.fr", email_confirmed_at: "2026-09-01T08:00:00Z" } },
      error: null,
    });
    expect((await resendConfirmationAction({}, form({ userId: LEARNER }))).error).toMatch(
      /déjà confirmée/u,
    );
    expect((await confirmEmailAction({}, form({ userId: LEARNER }))).error).toMatch(
      /déjà confirmée/u,
    );
    expect(m.resend).not.toHaveBeenCalled();
    expect(m.updateUserById).not.toHaveBeenCalled();
  });

  it("confirms the address without the mail, and logs who decided", async () => {
    const result = await confirmEmailAction({}, form({ userId: LEARNER }));
    expect(m.updateUserById).toHaveBeenCalledWith(LEARNER, { email_confirm: true });
    expect(audited()).toMatchObject({ actorId: ADMIN, action: "admin.user.email_confirmed" });
    expect(result.ok).toBe(true);
  });

  it("reports the address confirmed when only the audit write fails", async () => {
    m.record.mockRejectedValue(new Error("audit_logs unavailable"));
    const result = await confirmEmailAction({}, form({ userId: LEARNER }));
    expect(result).toMatchObject({ ok: true, auditFailed: true });
  });

  it("revalidates nothing, so the pending row it came from keeps its notice", async () => {
    // Any revalidation re-renders the calling page: on the pending list that
    // read the list again, the confirmed row left it, and the notice - with a
    // failed audit write - left with it.
    await confirmEmailAction({}, form({ userId: LEARNER }));
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("says when no auth identity stands behind the profile", async () => {
    m.getUserById.mockResolvedValue({ data: { user: null }, error: { status: 404 } });
    expect((await confirmEmailAction({}, form({ userId: LEARNER }))).error).toMatch(
      /Aucun identifiant/u,
    );
  });
});

describe("a sign-up that never confirmed, and has no profile yet", () => {
  // Supabase Auth knows the account; users does not, until the first sign-in.
  const PENDING = "44444444-4444-4444-8444-444444444444";

  beforeEach(() => {
    m.getUserById.mockResolvedValue({
      data: { user: { email: "pending@exemple.fr", email_confirmed_at: null } },
      error: null,
    });
  });

  it("gets its confirmation mail again, from its auth id", async () => {
    const result = await resendConfirmationAction({}, form({ userId: PENDING }));
    expect(m.getUserById).toHaveBeenCalledWith(PENDING);
    expect(m.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "pending@exemple.fr",
      options: { emailRedirectTo: "https://cyberlearn.fr/auth/callback?next=/onboarding" },
    });
    expect(result).toMatchObject({
      ok: true,
      notice: "E-mail de confirmation renvoyé à pending@exemple.fr.",
    });
    expect(m.record).toHaveBeenCalledWith({
      actorId: ADMIN,
      action: "admin.user.confirmation_resent",
      targetType: "User",
      targetId: PENDING,
      metadata: { pendingSignUp: true },
    });
  });

  it("gets its address confirmed, and is told the profile comes at the first sign-in", async () => {
    const result = await confirmEmailAction({}, form({ userId: PENDING }));
    expect(m.updateUserById).toHaveBeenCalledWith(PENDING, { email_confirm: true });
    expect(audited()).toMatchObject({
      action: "admin.user.email_confirmed",
      targetId: PENDING,
      metadata: { pendingSignUp: true },
    });
    expect(result.ok).toBe(true);
    expect(result.notice).toMatch(/première connexion/u);
  });

  it("marks nothing as pending for an account that has a profile", async () => {
    await confirmEmailAction({}, form({ userId: LEARNER }));
    expect(audited()?.metadata).toBeUndefined();
  });

  it("says the account is gone when Supabase does not know it either", async () => {
    m.getUserById.mockResolvedValue({ data: { user: null }, error: { status: 404 } });
    expect((await resendConfirmationAction({}, form({ userId: PENDING }))).error).toBe(
      "Ce compte n'existe plus.",
    );
    expect((await confirmEmailAction({}, form({ userId: PENDING }))).error).toBe(
      "Ce compte n'existe plus.",
    );
    expect(m.resend).not.toHaveBeenCalled();
    expect(m.updateUserById).not.toHaveBeenCalled();
    expect(m.record).not.toHaveBeenCalled();
  });

  it("still requires an administrator", async () => {
    m.requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(confirmEmailAction({}, form({ userId: PENDING }))).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(m.getUserById).not.toHaveBeenCalled();
  });

  it("reports a failed read as a failed gesture, not as a crash", async () => {
    m.getUserById.mockRejectedValue(new Error("network down"));
    expect((await resendConfirmationAction({}, form({ userId: PENDING }))).error).toBe(
      "Le renvoi a échoué.",
    );
  });
});
