import type { Factor, GoTrueAdminMFAApi } from "@supabase/supabase-js";

/**
 * Removing the TOTP factors of one account, with the service role.
 *
 * Supabase TOTP has no backup codes. An admin who loses the phone their factor
 * lives on is stopped at /mfa for good - the console requires the second step
 * for every session, and nothing in it can lift that for its own operator.
 * This is the way back in: run by whoever holds the service role key, never
 * reachable from a browser (`prisma/reset-mfa.ts`, docs/authentication.md).
 *
 * Deleting a verified factor also ends every session of the account, so the
 * next sign-in starts from the password and the console asks for a new
 * enrolment.
 */

/** What the audit log calls it. */
export const MFA_RESET_AUDIT_ACTION = "user.mfa.reset";

/** The two calls the reset needs, so a test can stand in for the admin API. */
export type MfaAdminApi = Pick<GoTrueAdminMFAApi, "listFactors" | "deleteFactor">;

export interface MfaResetResult {
  /** Ids of the factors that are gone. */
  removed: string[];
  /** Factors Supabase refused to delete, with its reason. */
  failed: { id: string; message: string }[];
}

/**
 * The account's TOTP factors, verified or not. An unverified one is a QR code
 * shown and never confirmed; it goes too, or it holds the factor name the
 * next enrolment wants. Other factor types are left alone: the platform only
 * enrols TOTP.
 */
export async function listTotpFactors(mfa: MfaAdminApi, userId: string): Promise<Factor[]> {
  const { data, error } = await mfa.listFactors({ userId });
  if (error) throw new Error(`Listing the factors failed: ${error.message}`);
  return data.factors.filter((factor) => factor.factor_type === "totp");
}

/**
 * Deletes each factor in turn. One refusal does not stop the others: the
 * result says which went and which did not, and the audit entry records both.
 */
export async function removeFactors(
  mfa: MfaAdminApi,
  userId: string,
  factorIds: readonly string[],
): Promise<MfaResetResult> {
  const result: MfaResetResult = { removed: [], failed: [] };
  for (const id of factorIds) {
    const { error } = await mfa.deleteFactor({ id, userId });
    if (error) result.failed.push({ id, message: error.message });
    else result.removed.push(id);
  }
  return result;
}

/**
 * The audit_logs row of a reset. No actor: the operator is at a terminal with
 * the service role, not signed in to the console, and the row says so.
 */
export function mfaResetAuditData(
  userId: string,
  result: MfaResetResult,
): {
  actorId: null;
  action: string;
  targetType: string;
  targetId: string;
  metadata: { source: "cli"; removedFactors: number; failedFactors: number };
} {
  return {
    actorId: null,
    action: MFA_RESET_AUDIT_ACTION,
    targetType: "user",
    targetId: userId,
    metadata: {
      source: "cli",
      removedFactors: result.removed.length,
      failedFactors: result.failed.length,
    },
  };
}
