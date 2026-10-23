/**
 * The root layout's session gate, as pure rules: when the second-factor check
 * holds the screens back, and where a session is sent.
 */

/** What getAuthenticatorAssuranceLevel answered, and for which token. */
export interface AssuranceAssessment {
  userId: string;
  accessToken: string;
  mfaRequired: boolean;
}

export interface SessionKey {
  userId: string;
  accessToken: string;
}

export interface AssuranceView {
  /**
   * No answer yet for this account: nothing it owns may be mounted, so the
   * layout shows its loader. Only the first check of an account does this.
   */
  pending: boolean;
  /**
   * The answer is for an earlier token of the same account. The screens stay
   * mounted, and the gate waits for the new answer before routing on it.
   */
  stale: boolean;
  /** Whether the session owes its code. Assumed while pending. */
  mfaRequired: boolean;
}

/**
 * Reads the last assessment against the current session.
 *
 * Every new access token used to count as "not checked yet", and the layout
 * replaced the whole navigator with its loader until the check came back. A
 * token changes at every refresh (back in the foreground, about hourly) and at
 * every verified code, so each one unmounted the screen in use: a quiz in
 * progress, a form being filled, the notice confirming the second factor was
 * just enabled. A token of the same account changes nothing that was already
 * mounted, so only a new account waits behind the loader.
 */
export function assuranceView(
  session: SessionKey | null,
  assessment: AssuranceAssessment | null,
): AssuranceView {
  if (!session) return { pending: false, stale: false, mfaRequired: false };
  if (assessment?.userId !== session.userId) {
    return { pending: true, stale: false, mfaRequired: true };
  }
  return {
    pending: false,
    stale: assessment.accessToken !== session.accessToken,
    mfaRequired: assessment.mfaRequired,
  };
}

/** Where the gate sends a session; "signed-in" is home, or the new password during a recovery. */
export type GateRedirect = "/login" | "/mfa" | "signed-in" | null;

/**
 * Where the gate sends the current screen, if anywhere.
 *
 * The code screen sits in the (auth) group, and a signed-out visitor used to
 * be left alone anywhere in that group. "Utiliser un autre compte" signs out
 * from the code screen, and it stayed there, without a session, with a code
 * that could no longer be checked and no screen behind it to go back to. The
 * code screen is the one (auth) screen that needs a session.
 */
export function sessionGateRedirect(input: {
  hasSession: boolean;
  mfaRequired: boolean;
  inAuth: boolean;
  pathname: string;
}): GateRedirect {
  const inMfaChallenge = input.pathname === "/mfa";
  if (!input.hasSession) return !input.inAuth || inMfaChallenge ? "/login" : null;
  if (input.mfaRequired) return inMfaChallenge ? null : "/mfa";
  return input.inAuth ? "signed-in" : null;
}
