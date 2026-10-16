import type { UserRole } from "@cyberlearn/db";

/**
 * What the console refuses to do to an account, decided before anything is
 * written.
 *
 * Kept pure and out of the "use server" modules, which may only export
 * actions: these are the rules a reviewer wants to read in one place, and the
 * tests want to run without a database or a Supabase project behind them.
 *
 * Each returns the sentence the administrator reads, or null when the action
 * may go ahead.
 */

/**
 * Why an administrator's second factor is not reset here, and where to go
 * instead. Shown on the account page as well as returned by the action, so it
 * is one string.
 */
export const ADMIN_MFA_REFUSAL =
  "La double authentification d'un administrateur ne se réinitialise pas depuis la console. Suis la procédure de secours décrite dans docs/authentication.md.";

/**
 * Refuses a role change an administrator makes on their own account.
 *
 * The acting account is always an administrator, so any change to it is a
 * demotion, and a demotion of oneself takes effect mid-request: the session
 * that asked loses the console it asked from, with no way to undo the click.
 * Another administrator can do it, which is also a second pair of eyes.
 *
 * The last administrator is refused elsewhere, in the repository, because that
 * rule depends on every other account and has to be checked in the same
 * transaction that writes the role.
 */
export function roleChangeRefusal(input: {
  actorId: string;
  targetId: string;
  newRole: UserRole;
}): string | null {
  if (input.actorId === input.targetId && input.newRole !== "ADMIN") {
    return "Tu ne peux pas retirer ton propre rôle d'administrateur. Un autre administrateur peut le faire.";
  }
  return null;
}

/**
 * Refuses a ban the console must not issue, from the account's page and from
 * the moderation queue alike.
 *
 * On oneself: an administrator banning themselves would lock the console's
 * own door from the inside, with the key on the other side. On another
 * administrator: a ban does not reach the console, so it would only take the
 * site away from someone who still holds every key to it - the role is what
 * has to go first, deliberately, on the users list.
 *
 * The queue used to skip both: a flagged message written by an administrator,
 * the moderator's own included, could get its author banned by a choice in a
 * dropdown that the account's page refuses.
 */
export function banRefusal(input: {
  actorId: string;
  targetId: string;
  targetRole: UserRole;
}): string | null {
  if (input.actorId === input.targetId) return "Tu ne peux pas te bannir toi-même.";
  if (input.targetRole === "ADMIN") return "Retire d'abord le rôle administrateur de ce compte.";
  return null;
}

/** The sentence for a demotion the repository refused. */
export const LAST_ADMIN_REFUSAL =
  "C'est le dernier administrateur. Donne d'abord le rôle Admin à un autre compte.";

/**
 * How long an account that held the ADMIN role keeps an administrator's
 * protection, once the role is gone.
 */
export const RECENT_ADMIN_DAYS = 30;

/** The start of that span, counted back from `now`. */
export function recentAdminSince(now: Date): Date {
  return new Date(now.getTime() - RECENT_ADMIN_DAYS * 24 * 60 * 60 * 1000);
}

/** Why the second factor of a recently demoted administrator is not reset here. */
export const RECENT_ADMIN_MFA_REFUSAL = `Ce compte était administrateur il y a moins de ${String(RECENT_ADMIN_DAYS)} jours : sa double authentification ne se réinitialise pas depuis la console. Suis la procédure de secours décrite dans docs/authentication.md.`;

/**
 * Refuses a second-factor reset the console must not perform.
 *
 * On oneself: an administrator who can reach this page has just passed their
 * own second factor, so there is nothing to recover, and removing it would
 * lock them out of the console at their next request.
 *
 * On another administrator: the second factor is what stands between a
 * phished password and the whole console, and one administrator removing
 * another's is exactly the move an attacker holding one admin session would
 * make. Until a two-person flow exists, it goes through the break-glass
 * procedure, run by an operator outside the console.
 *
 * On an account that held the role in the last RECENT_ADMIN_DAYS days, for
 * the same reason: otherwise that one session would demote the administrator,
 * reset the factor of what is now a learner, promote them back, and enrol a
 * new factor with the phished password alone. `wasRecentlyAdmin` is read from
 * the audit log by the caller, which keeps this function pure.
 */
export function mfaResetRefusal(input: {
  actorId: string;
  targetId: string;
  targetRole: UserRole;
  wasRecentlyAdmin: boolean;
}): string | null {
  if (input.actorId === input.targetId) {
    return "Tu ne peux pas réinitialiser ta propre double authentification depuis la console.";
  }
  if (input.targetRole === "ADMIN") return ADMIN_MFA_REFUSAL;
  if (input.wasRecentlyAdmin) return RECENT_ADMIN_MFA_REFUSAL;
  return null;
}
