/**
 * The account's TOTP factors as the security panels show them, and the way
 * they are removed.
 *
 * Two panels manage the second factor: the site's account settings and the
 * app's security screen. The site's started out showing "MFA INACTIF" and an
 * enrol button while it was still asking Supabase, and kept them when the
 * question failed, to an account that was protected all along. Removal went
 * on one click, with nothing asked, and was offered to administrators too.
 * These rules live here, pure, so that the two panels cannot drift apart
 * again; the app does not depend on @cyberlearn/ui, hence plain functions
 * over an injected client.
 */

export interface TotpFactorSummary {
  id: string;
  /** The name given at enrolment, if any. */
  friendlyName: string | null;
}

/** What a panel knows about the factors: nothing yet, nothing at all, or the list. */
export type TotpFactorsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; factors: TotpFactorSummary[] };

/** The part of `supabase.auth.mfa.listFactors()`'s answer read here. */
export interface ListFactorsAnswer {
  // `totp` holds the verified TOTP factors only: supabase-js filters it.
  data: { totp: readonly { id: string; friendly_name?: string | null }[] } | null;
  error: unknown;
}

/**
 * Reads what listFactors answered. An error, or no answer, is "error", never
 * "no factor": telling a protected account it is unprotected invites it to
 * enrol a second factor over the first.
 */
export function readTotpFactors(answer: ListFactorsAnswer): TotpFactorsState {
  if (answer.error || !answer.data) return { status: "error" };
  return {
    status: "ready",
    factors: answer.data.totp.map((factor) => ({
      id: factor.id,
      friendlyName: factor.friendly_name?.trim() ? factor.friendly_name.trim() : null,
    })),
  };
}

/** The two calls of `supabase.auth.mfa` that removal needs. */
export interface TotpRemovalClient {
  challengeAndVerify: (params: { factorId: string; code: string }) => Promise<{ error: unknown }>;
  unenroll: (params: { factorId: string }) => Promise<{ error: unknown }>;
}

/** How a removal ended. */
export type TotpRemovalOutcome = "disabled" | "invalid_code" | "failed";

/**
 * Whether an account may remove its own second factor from the site's panel
 * or the app's screen: never an administrator's.
 *
 * The console requires the factor, and resetting an administrator's is the
 * break-glass procedure of docs/authentication.md ("Lost authenticator"),
 * which the console itself refuses to perform. A panel that offered removal
 * would be a quicker way round that procedure than the procedure. This hides
 * a control; it is not a refusal on the server, which Supabase Auth does not
 * make: any aal2 session may unenroll its own verified factors.
 */
export function canRemoveOwnTotp(role: string | null | undefined): boolean {
  return role !== "ADMIN";
}

/**
 * Removes every verified TOTP factor, once a fresh code from one of them has
 * been accepted.
 *
 * The fresh code guards against removal through the panel by a stray click or
 * tap, and by someone at a device left signed in who does not have the
 * authenticator at hand. It is checked from the client, before the client
 * unenrolls: Supabase Auth itself asks only for an aal2 session, so whoever
 * holds a stolen aal2 session can call its unenroll endpoint directly and
 * skip this step. It does not protect against that, and is not meant to. A
 * code accepted for any of the factors is enough, since each one proves the
 * same thing; trying them in turn covers an account that ended up with two.
 *
 * Every factor goes, not only the first: a second one left behind would keep
 * asking for a code the panel says is no longer needed.
 */
export async function removeTotpFactors(
  client: TotpRemovalClient,
  factorIds: readonly string[],
  code: string,
): Promise<TotpRemovalOutcome> {
  if (factorIds.length === 0) return "failed";

  let verified = false;
  for (const factorId of factorIds) {
    const { error } = await client.challengeAndVerify({ factorId, code });
    if (!error) {
      verified = true;
      break;
    }
  }
  if (!verified) return "invalid_code";

  for (const factorId of factorIds) {
    const { error } = await client.unenroll({ factorId });
    if (error) return "failed";
  }
  return "disabled";
}
