"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditLogRepository, userRepository } from "@cyberlearn/db";
import { AUDIT_ACTION, type AuditAction } from "@cyberlearn/db/audit-actions";
import { createSupabaseAdminClient } from "@cyberlearn/db/supabase/admin";
import { sendMfaResetEmail } from "@cyberlearn/email";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { mfaResetRefusal, recentAdminSince } from "@/lib/account-guards";
import { requireAdminAction } from "@/lib/auth";
import { env } from "@/lib/env";
import { learnerSiteUrl, learnerUrl } from "@/lib/learner-url";
import { securityContactUrl } from "@/lib/support-contact";

/**
 * The gestures that get somebody back into their account.
 *
 * A lost phone, a confirmation mail that never arrived, a forgotten password:
 * before these, the console's only answer to any of them was to delete the
 * account. Each one acts on Supabase Auth through the service role and is
 * written to the audit log. The password and confirmation links go out in the
 * same mails the learner would get on their own, so support never sees a link
 * that opens somebody's account: the link goes to the mailbox, and only there.
 *
 * The audit row is written after the gesture, outside the try that covers the
 * call to Supabase, and its own failure never turns the gesture into an
 * error: by then the account has changed or the mail has left, and saying
 * otherwise would invite the administrator to do it again. The page says the
 * trace is missing instead.
 */

export interface AccessActionState {
  ok?: boolean;
  error?: string;
  /** What was done, in a sentence, once it is done. */
  notice?: string;
  /** True when the action ran but its notice could not be delivered. */
  emailFailed?: boolean;
  /** True when the action ran but its audit log row could not be written. */
  auditFailed?: boolean;
}

const targetSchema = z.object({ userId: z.guid() });

/** Supabase answers 429 when a mail to this address went out under a minute ago. */
const TOO_SOON =
  "Un e-mail est déjà parti vers cette adresse il y a moins d'une minute. Réessaie dans un instant.";
const NO_IDENTITY = "Aucun identifiant de connexion n'est rattaché à ce compte.";

/** Where a recovery link lands on the site, as the self-service form sends it. */
const RECOVERY_REDIRECT = "/auth/callback?next=/reset-password";
/** Where a confirmation link lands, as the sign-up form sends it. */
const SIGNUP_REDIRECT = "/auth/callback?next=/onboarding";

/**
 * The account as Supabase Auth has it: its address there is the one mails go
 * to, and its confirmation is what the sign-in checks.
 */
async function authAccount(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
): Promise<{ email: string; confirmed: boolean } | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error?.status === 404) return null;
  if (error !== null) throw error;
  if (data.user.email === undefined) return null;
  return { email: data.user.email, confirmed: Boolean(data.user.email_confirmed_at) };
}

/**
 * Writes a gesture that already happened to the audit log. Returns whether the
 * row was written; a failure is logged here and never thrown, so the caller
 * can still report what it did.
 */
async function audit(
  actorId: string,
  action: AuditAction,
  targetId: string,
  metadata?: Record<string, number | boolean>,
): Promise<boolean> {
  try {
    await auditLogRepository.record({ actorId, action, targetType: "User", targetId, metadata });
    return true;
  } catch (error) {
    logger.error({ scope: "admin", action, err: errorMessage(error) }, "audit write failed");
    return false;
  }
}

// ─── Second factor ──────────────────────────────────────────────────────────

const mfaResetSchema = targetSchema.extend({
  /**
   * The account's address, typed back.
   *
   * A confirmation against the wrong click, as on the deletion form: it shows
   * the administrator is acting on the account they meant, not who asked. The
   * page displays the address, so anybody can type it. Checking that the
   * request came from the account's holder stays the administrator's job,
   * before the click, and the card says so.
   */
  confirmEmail: z.string().trim().toLowerCase().pipe(z.email()),
});

/**
 * Removes every TOTP factor of a learner who can no longer produce a code.
 *
 * Supabase keeps no backup codes, so a lost phone used to leave somebody at
 * /mfa for good. Never on oneself, never on another administrator, and never
 * on an account that was one in the last few weeks: see mfaResetRefusal.
 * Removing a verified factor also signs the account out everywhere, which the
 * notice says.
 *
 * Remove first, then write to them, as the ban does: the notice is then always
 * true, and a mail that does not go out is a missing notice rather than a false
 * one.
 */
export async function resetMfaAction(
  _prev: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const admin = await requireAdminAction();
  const parsed = mfaResetSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Adresse de confirmation invalide." };

  const target = await userRepository.findConsoleTarget(parsed.data.userId);
  if (!target) return { error: "Ce compte n'existe plus." };
  if (target.email.toLowerCase() !== parsed.data.confirmEmail) {
    return { error: "L'adresse saisie ne correspond pas à ce compte." };
  }

  // Read before the guard, and fail closed: a reset this check could not rule
  // out is the one it exists to stop.
  let wasRecentlyAdmin: boolean;
  try {
    wasRecentlyAdmin = await userRepository.heldAdminRoleSince(
      target.id,
      recentAdminSince(new Date()),
    );
  } catch (error) {
    logger.error(
      { scope: "admin", err: errorMessage(error) },
      "resetMfaAction: role history read failed",
    );
    return {
      error: "L'historique des rôles de ce compte n'a pas pu être lu. Rien n'a été retiré.",
    };
  }

  const refusal = mfaResetRefusal({
    actorId: admin.id,
    targetId: target.id,
    targetRole: target.role,
    wasRecentlyAdmin,
  });
  if (refusal !== null) return { error: refusal };

  const supabase = createSupabaseAdminClient();
  let found: { id: string; verified: boolean }[];
  try {
    const { data, error } = await supabase.auth.admin.mfa.listFactors({ userId: target.id });
    if (error !== null) throw error;
    found = data.factors
      .filter((factor) => factor.factor_type === "totp")
      .map((factor) => ({ id: factor.id, verified: factor.status === "verified" }));
  } catch (error) {
    logger.error(
      { scope: "admin", err: errorMessage(error) },
      "resetMfaAction: listFactors failed",
    );
    return { error: "Les facteurs de ce compte n'ont pas pu être lus. Rien n'a été retiré." };
  }
  if (found.length === 0) return { error: "Ce compte n'a pas de double authentification." };

  // One at a time, so that a failure halfway is reported for what it is: some
  // factors gone, some not. Retrying picks up where it stopped.
  const removed: typeof found = [];
  for (const factor of found) {
    try {
      const { error } = await supabase.auth.admin.mfa.deleteFactor({
        id: factor.id,
        userId: target.id,
      });
      if (error !== null) throw error;
    } catch (error) {
      logger.error(
        { scope: "admin", err: errorMessage(error) },
        "resetMfaAction: deleteFactor failed",
      );
      break;
    }
    removed.push(factor);
  }

  // Written whatever happened, a half-finished reset included: it changed the
  // account, and the log is where the next person looks to find out how.
  const logged = await audit(admin.id, AUDIT_ACTION.user.mfaReset, target.id, {
    factorsFound: found.length,
    factorsRemoved: removed.length,
    complete: removed.length === found.length,
  });
  revalidatePath(`/users/${target.id}`);

  if (removed.length === 0) return { error: "La réinitialisation a échoué. Rien n'a été retiré." };
  if (removed.length < found.length) {
    return {
      error: `La réinitialisation s'est arrêtée en route : ${String(removed.length)} facteur sur ${String(found.length)} retiré. Réessaie.`,
      auditFailed: !logged,
    };
  }

  let emailFailed = false;
  try {
    await sendMfaResetEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.RESEND_FROM_EMAIL,
      to: target.email,
      displayName: target.displayName || (target.username ?? "toi"),
      resetAt: new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Europe/Paris",
      }).format(new Date()),
      securityUrl: learnerUrl("/settings/account"),
      sessionsClosed: removed.some((factor) => factor.verified),
      contactUrl: securityContactUrl(),
      siteUrl: learnerSiteUrl(),
    });
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "mfa reset notice failed");
    emailFailed = true;
  }

  return {
    ok: true,
    // Whatever the sign-in method: an account created through GitHub has no
    // password to sign in with.
    notice: `Double authentification retirée (${String(removed.length)} facteur${removed.length > 1 ? "s" : ""}). La personne peut se connecter comme d'habitude, sans code, puis la réactiver.`,
    emailFailed,
    auditFailed: !logged,
  };
}

// ─── Sessions ───────────────────────────────────────────────────────────────

/**
 * Signs the account out everywhere: the site, the app, the console.
 *
 * For a phone lost while still signed in, a password typed on somebody else's
 * computer, an account somebody else got into. The repository deletes the
 * sessions and writes the audit row in one transaction, so a failure leaves
 * both as they were, and there is no "done but not logged" to report.
 *
 * Never on oneself: the administrator's own session is one of them, and
 * closing it mid-request would end the page that asked.
 */
export async function revokeAllSessionsAction(
  _prev: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const admin = await requireAdminAction();
  const parsed = targetSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Paramètres invalides." };
  if (parsed.data.userId === admin.id) {
    return {
      error:
        "Tu ne peux pas fermer tes propres sessions depuis la console : celle que tu utilises en fait partie.",
    };
  }

  const target = await userRepository.findConsoleTarget(parsed.data.userId);
  if (!target) return { error: "Ce compte n'existe plus." };

  let revoked: number;
  try {
    revoked = await userRepository.revokeAllSessions(target.id, { actorId: admin.id });
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "revokeAllSessionsAction failed");
    return { error: "La déconnexion a échoué. Aucune session n'a été fermée." };
  }

  return {
    ok: true,
    notice:
      revoked === 0
        ? "Aucune session n'était ouverte sur ce compte."
        : `${String(revoked)} session${revoked > 1 ? "s fermées" : " fermée"}. Le site et l'app redemandent la connexion dès la page suivante ; un jeton déjà délivré reste accepté par l'API de données une heure au plus.`,
  };
}

// ─── Password ───────────────────────────────────────────────────────────────

/**
 * Sends the account the same recovery mail the "mot de passe oublié" form
 * sends, link and code included.
 *
 * Not generateLink, which hands the link back to the caller: a link that opens
 * somebody's account has no business on an administrator's screen. This one
 * goes through Supabase's send hook to the account's mailbox and nowhere else.
 */
export async function sendPasswordResetAction(
  _prev: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const admin = await requireAdminAction();
  const parsed = targetSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Paramètres invalides." };

  const target = await userRepository.findConsoleTarget(parsed.data.userId);
  if (!target) return { error: "Ce compte n'existe plus." };

  let sentTo: string;
  try {
    const supabase = createSupabaseAdminClient();
    const account = await authAccount(supabase, target.id);
    if (account === null) return { error: NO_IDENTITY };

    const { error } = await supabase.auth.resetPasswordForEmail(account.email, {
      redirectTo: learnerUrl(RECOVERY_REDIRECT),
    });
    if (error?.status === 429) return { error: TOO_SOON };
    if (error !== null) throw error;
    sentTo = account.email;
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "sendPasswordResetAction failed");
    return { error: "L'envoi du lien a échoué." };
  }

  const logged = await audit(admin.id, AUDIT_ACTION.user.passwordResetSent, target.id);
  return {
    ok: true,
    notice: `Lien de réinitialisation envoyé à ${sentTo}.`,
    auditFailed: !logged,
  };
}

// ─── Address confirmation ───────────────────────────────────────────────────

/**
 * The account an address gesture acts on: the Supabase Auth account, whether
 * or not it has a profile yet.
 *
 * A sign-up gets its row in users at its first sign-in, and a password
 * sign-in needs a confirmed address: somebody whose confirmation mail never
 * arrived has no profile at all. They are the very people these two gestures
 * are for, so the auth account is what they look up, and the console's list
 * of pending sign-ups calls them with its id.
 */
async function addressTarget(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
): Promise<{ ok: true; email: string; withoutProfile: boolean } | { ok: false; error: string }> {
  const [profile, account] = await Promise.all([
    userRepository.findConsoleTarget(userId),
    authAccount(supabase, userId),
  ]);
  if (account === null) {
    return { ok: false, error: profile === null ? "Ce compte n'existe plus." : NO_IDENTITY };
  }
  if (account.confirmed) return { ok: false, error: "Cette adresse est déjà confirmée." };
  return { ok: true, email: account.email, withoutProfile: profile === null };
}

/** Sends the sign-up confirmation mail again, to an address not yet confirmed. */
export async function resendConfirmationAction(
  _prev: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const admin = await requireAdminAction();
  const parsed = targetSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Paramètres invalides." };
  const userId = parsed.data.userId;

  let sentTo: string;
  let withoutProfile: boolean;
  try {
    const supabase = createSupabaseAdminClient();
    const target = await addressTarget(supabase, userId);
    if (!target.ok) return { error: target.error };

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: target.email,
      options: { emailRedirectTo: learnerUrl(SIGNUP_REDIRECT) },
    });
    if (error?.status === 429) return { error: TOO_SOON };
    if (error !== null) throw error;
    sentTo = target.email;
    withoutProfile = target.withoutProfile;
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "resendConfirmationAction failed");
    return { error: "Le renvoi a échoué." };
  }

  const logged = await audit(
    admin.id,
    AUDIT_ACTION.user.confirmationResent,
    userId,
    withoutProfile ? { pendingSignUp: true } : undefined,
  );
  return {
    ok: true,
    notice: `E-mail de confirmation renvoyé à ${sentTo}.`,
    auditFailed: !logged,
  };
}

/**
 * Marks the address confirmed without the mail.
 *
 * For the case the mail cannot solve: it lands in a filter, or the school's
 * server drops it. It vouches for an address nobody proved they read, so the
 * page asks before it runs and the audit log keeps who decided.
 */
export async function confirmEmailAction(
  _prev: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const admin = await requireAdminAction();
  const parsed = targetSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Paramètres invalides." };
  const userId = parsed.data.userId;

  let confirmed: string;
  let withoutProfile: boolean;
  try {
    const supabase = createSupabaseAdminClient();
    const target = await addressTarget(supabase, userId);
    if (!target.ok) return { error: target.error };

    const { error } = await supabase.auth.admin.updateUserById(userId, { email_confirm: true });
    if (error !== null) throw error;
    confirmed = target.email;
    withoutProfile = target.withoutProfile;
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "confirmEmailAction failed");
    return { error: "La confirmation a échoué." };
  }

  const logged = await audit(
    admin.id,
    AUDIT_ACTION.user.emailConfirmed,
    userId,
    withoutProfile ? { pendingSignUp: true } : undefined,
  );
  // Nothing revalidated here, on purpose. Revalidating any path re-renders the
  // page the action came from, and on the list of pending sign-ups that read
  // the list again: the confirmed address left it, and its notice - and a
  // failed audit write - went with the row. The account's page refreshes
  // itself on success instead (SignInActions); the pending row stays, with
  // its notice, until the list is read again.
  return {
    ok: true,
    // Without a profile, the account still has to sign in once to get one.
    notice: withoutProfile
      ? `Adresse ${confirmed} confirmée. Le compte apparaîtra dans la liste à sa première connexion.`
      : `Adresse ${confirmed} confirmée.`,
    auditFailed: !logged,
  };
}
