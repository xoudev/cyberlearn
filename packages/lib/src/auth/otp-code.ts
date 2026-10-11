/**
 * The six digits of a TOTP code, typed or pasted, and the rule that sends them
 * without a click.
 *
 * Five screens ask for that code: the site's sign-in challenge and its
 * enrolment, the console's challenge and its enrolment, and the app's
 * challenge. Only the first one sent it on its own; on the others the button
 * stayed the only way in, and on the console Enter did nothing at all. The
 * rule lives here, pure, because the app does not depend on @cyberlearn/ui and
 * has to share it all the same.
 */

/** A TOTP code is always this long (RFC 6238 with Supabase's defaults). */
export const OTP_CODE_LENGTH = 6;

const COMPLETE_CODE = /^\d{6}$/u;

/**
 * What the field keeps of a keystroke or a paste: the digits, six at most.
 *
 * Authenticator apps display the code as "123 456" and a text message may say
 * "123-456"; both paste as "123456" instead of being refused. The field must
 * not carry a `maxLength` for this to work: the browser truncates a paste to
 * the limit before anything else sees it, so "123 456" would arrive as
 * "123 45".
 */
export function sanitizeOtpCode(raw: string): string {
  return raw.replace(/\D/gu, "").slice(0, OTP_CODE_LENGTH);
}

/** True for exactly six digits, the only shape a code is ever sent in. */
export function isCompleteOtpCode(code: string): boolean {
  return COMPLETE_CODE.test(code);
}

/**
 * Remembers which code was sent last, so that the sixth digit sends it once.
 *
 * Without the memory the rule loops: a refused code stays in the field, the
 * request ends, nothing is pending any more, and six digits are still there.
 */
export interface OtpAutoSubmit {
  /**
   * True when `code` should be sent now: it is complete, nothing is in flight,
   * and it is not the code that was sent last. Records it when it says yes.
   *
   * While `pending` it answers no without recording anything, so a code typed
   * during a request is sent once that request is over.
   */
  shouldSubmit: (code: string, pending: boolean) => boolean;
  /**
   * Records a code sent by hand (a button, Enter). Insisting on a refused code
   * is allowed, and must not be followed by a second, automatic send of it.
   */
  markSubmitted: (code: string) => void;
  /** Forgets the last code, for a screen that starts over (a new enrolment). */
  reset: () => void;
}

export function createOtpAutoSubmit(): OtpAutoSubmit {
  let lastSubmitted: string | null = null;
  return {
    shouldSubmit(code, pending) {
      if (pending || !isCompleteOtpCode(code) || code === lastSubmitted) return false;
      lastSubmitted = code;
      return true;
    },
    markSubmitted(code) {
      lastSubmitted = code;
    },
    reset() {
      lastSubmitted = null;
    },
  };
}

/**
 * A TOTP secret in groups of four ("JBSW Y3DP EHPK 3PXP"), for the manual
 * entry under the QR code. Thirty-two characters in one run are where a reader
 * loses their place; authenticator apps ignore the spaces.
 */
export function groupOtpSecret(secret: string): string {
  return (secret.replace(/\s/gu, "").match(/.{1,4}/gu) ?? []).join(" ");
}
