import type { Factor, User, UserIdentity } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@cyberlearn/db/supabase/admin";
import { errorMessage, logger } from "@cyberlearn/lib/logger";

/**
 * How an account signs in, read from Supabase Auth for the console.
 *
 * The application's own users table knows nothing about this: whether the
 * address was confirmed, which second factors exist and when the account last
 * signed in all live in auth.users, behind the service role. Support needs all
 * three before it can say why somebody is stuck at the door.
 *
 * Server only: the service-role client bypasses every policy.
 */

export type SignInState =
  | {
      status: "ok";
      emailConfirmedAt: Date | null;
      lastSignInAt: Date | null;
      /** "email", "github": how the account can sign in. */
      providers: string[];
      /** TOTP factors that ask for a code at sign-in. */
      verifiedTotp: number;
      /** TOTP enrolments started and never finished. */
      pendingTotp: number;
    }
  /** No auth identity behind the profile, like a seeded account. */
  | { status: "missing" }
  /** Supabase did not answer; the page says so rather than guessing. */
  | { status: "unavailable" };

/** Counts the TOTP factors, finished and abandoned. Phone factors are off. */
export function totpTally(factors: readonly Pick<Factor, "factor_type" | "status">[]): {
  verified: number;
  pending: number;
} {
  const totp = factors.filter((factor) => factor.factor_type === "totp");
  const verified = totp.filter((factor) => factor.status === "verified").length;
  return { verified, pending: totp.length - verified };
}

/** The state, from what Supabase returned. Pure, so the mapping is tested. */
export function toSignInState(
  user: Pick<User, "email_confirmed_at" | "last_sign_in_at"> & {
    identities?: readonly Pick<UserIdentity, "provider">[] | undefined;
  },
  factors: readonly Pick<Factor, "factor_type" | "status">[],
): SignInState {
  const tally = totpTally(factors);
  const providers = [...new Set((user.identities ?? []).map((identity) => identity.provider))];
  return {
    status: "ok",
    emailConfirmedAt: user.email_confirmed_at ? new Date(user.email_confirmed_at) : null,
    lastSignInAt: user.last_sign_in_at ? new Date(user.last_sign_in_at) : null,
    providers: providers.sort(),
    verifiedTotp: tally.verified,
    pendingTotp: tally.pending,
  };
}

export async function readSignInState(userId: string): Promise<SignInState> {
  try {
    const supabase = createSupabaseAdminClient();
    const [user, factors] = await Promise.all([
      supabase.auth.admin.getUserById(userId),
      supabase.auth.admin.mfa.listFactors({ userId }),
    ]);
    if (user.error?.status === 404) return { status: "missing" };
    if (user.error !== null) throw user.error;
    if (factors.error !== null) throw factors.error;
    return toSignInState(user.data.user, factors.data.factors);
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "sign-in state lookup failed");
    return { status: "unavailable" };
  }
}
