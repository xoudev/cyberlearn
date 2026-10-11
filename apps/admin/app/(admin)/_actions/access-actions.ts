"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import { createSupabaseAdminClient } from "@cyberlearn/db/supabase/admin";
import { sendMfaResetEmail } from "@cyberlearn/email";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { mfaResetRefusal } from "@/lib/account-guards";
import { requireAdminAction } from "@/lib/auth";
import { env } from "@/lib/env";
import { learnerSiteUrl, learnerUrl } from "@/lib/learner-url";

/**
 * The gestures that get somebody back into their account.
 *
 * A lost phone, a confirmation mail that never arrived, a forgotten password:
 * before these, the console's only answer to any of them was to delete the
 * account. Each one acts on Supabase Auth through the service role and is
 * written to the audit log. The password and confirmation links go out in the
 * same mails the learner would get on their own, so support never sees a link
 * that opens somebody's account: the link goes to the mailbox, and only there.
 */

export interface AccessActionState {
  ok?: boolean;
  error?: string;
  /** What was done, in a sentence, once it is done. */
  notice?: string;
  /** True when the action ran but its notice could not be delivered. */
  emailFailed?: boolean;
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

async function findTarget(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, username: true, role: true },
  });
}

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

async function audit(
  actorId: string,
  action: string,
  targetId: string,
  metadata?: Record<string, number | boolean>,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      targetType: "User",
      targetId,
      ...(metadata !== undefined ? { metadata } : {}),
    },
  });
}

// ─── Second factor ──────────────────────────────────────────────────────────

const mfaResetSchema = targetSchema.extend({
  /**
   * The account's address, typed back.
   *
   * It is the identity check as much as the confirmation: a reset follows a
   * request, and pasting the address the request came from only matches when
   * that request came from this account's own mailbox.
   */
  confirmEmail: z.string().trim().toLowerCase().pipe(z.email()),
});

/**
 * Removes every TOTP factor of a learner who can no longer produce a code.
 *
 * Supabase keeps no backup codes, so a lost phone used to leave somebody at
 * /mfa for good. Never on oneself and never on another administrator: see
 * mfaResetRefusal. Removing a verified factor also signs the account out
 * everywhere, which the notice says.
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

  const target = await findTarget(parsed.data.userId);
  if (!target) return { error: "Ce compte n'existe plus." };
  if (target.email.toLowerCase() !== parsed.data.confirmEmail) {
    return { error: "L'adresse saisie ne correspond pas à ce compte." };
  }

  const refusal = mfaResetRefusal({
    actorId: admin.id,
    targetId: target.id,
    targetRole: target.role,
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
  await audit(admin.id, "admin.user.mfa_reset", target.id, {
    factorsFound: found.length,
    factorsRemoved: removed.length,
    complete: removed.length === found.length,
  });
  revalidatePath(`/users/${target.id}`);

  if (removed.length === 0) return { error: "La réinitialisation a échoué. Rien n'a été retiré." };
  if (removed.length < found.length) {
    return {
      error: `La réinitialisation s'est arrêtée en route : ${String(removed.length)} facteur sur ${String(found.length)} retiré. Réessaie.`,
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
      contactEmail: env.RESEND_FROM_EMAIL,
      siteUrl: learnerSiteUrl(),
    });
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "mfa reset notice failed");
    emailFailed = true;
  }

  return {
    ok: true,
    notice: `Double authentification retirée (${String(removed.length)} facteur${removed.length > 1 ? "s" : ""}). La personne peut se connecter avec son mot de passe et la réactiver.`,
    emailFailed,
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

  const target = await findTarget(parsed.data.userId);
  if (!target) return { error: "Ce compte n'existe plus." };

  try {
    const supabase = createSupabaseAdminClient();
    const account = await authAccount(supabase, target.id);
    if (account === null) return { error: NO_IDENTITY };

    const { error } = await supabase.auth.resetPasswordForEmail(account.email, {
      redirectTo: learnerUrl(RECOVERY_REDIRECT),
    });
    if (error?.status === 429) return { error: TOO_SOON };
    if (error !== null) throw error;

    await audit(admin.id, "admin.user.password_reset_sent", target.id);
    return { ok: true, notice: `Lien de réinitialisation envoyé à ${account.email}.` };
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "sendPasswordResetAction failed");
    return { error: "L'envoi du lien a échoué." };
  }
}

// ─── Address confirmation ───────────────────────────────────────────────────

/** Sends the sign-up confirmation mail again, to an address not yet confirmed. */
export async function resendConfirmationAction(
  _prev: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const admin = await requireAdminAction();
  const parsed = targetSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Paramètres invalides." };

  const target = await findTarget(parsed.data.userId);
  if (!target) return { error: "Ce compte n'existe plus." };

  try {
    const supabase = createSupabaseAdminClient();
    const account = await authAccount(supabase, target.id);
    if (account === null) return { error: NO_IDENTITY };
    if (account.confirmed) return { error: "Cette adresse est déjà confirmée." };

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: account.email,
      options: { emailRedirectTo: learnerUrl(SIGNUP_REDIRECT) },
    });
    if (error?.status === 429) return { error: TOO_SOON };
    if (error !== null) throw error;

    await audit(admin.id, "admin.user.confirmation_resent", target.id);
    return { ok: true, notice: `E-mail de confirmation renvoyé à ${account.email}.` };
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "resendConfirmationAction failed");
    return { error: "Le renvoi a échoué." };
  }
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

  const target = await findTarget(parsed.data.userId);
  if (!target) return { error: "Ce compte n'existe plus." };

  try {
    const supabase = createSupabaseAdminClient();
    const account = await authAccount(supabase, target.id);
    if (account === null) return { error: NO_IDENTITY };
    if (account.confirmed) return { error: "Cette adresse est déjà confirmée." };

    const { error } = await supabase.auth.admin.updateUserById(target.id, { email_confirm: true });
    if (error !== null) throw error;

    await audit(admin.id, "admin.user.email_confirmed", target.id);
    revalidatePath(`/users/${target.id}`);
    return { ok: true, notice: `Adresse ${account.email} confirmée.` };
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "confirmEmailAction failed");
    return { error: "La confirmation a échoué." };
  }
}
