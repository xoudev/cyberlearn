/**
 * Marker dropped by /auth/confirm when a session is opened through an emailed
 * password-recovery link.
 *
 * Setting a new password without proving the old one is legitimate exactly
 * once: right after clicking that link. Everywhere else - including a session
 * an attacker stole - the current password must be supplied, otherwise a
 * hijacked session turns into a permanent account takeover.
 */
export const RECOVERY_GRANT_COOKIE = "cl-pwd-recovery";

/** Long enough to fill the reset form, short enough not to linger. */
export const RECOVERY_GRANT_MAX_AGE_SECONDS = 15 * 60;

/**
 * What /reset-password says once the grant is gone: the form cannot ask for
 * the current password, which is the one that was forgotten, so the way on is
 * a new link. The app says the same with its code (RECOVERY_COPY.expired).
 */
export const RECOVERY_EXPIRED_MESSAGE =
  "Le délai de 15 minutes pour choisir un nouveau mot de passe est passé. Demande un nouveau lien de réinitialisation.";

/** Whether the request carries the grant /auth/confirm dropped. */
export function hasRecoveryGrant(cookies: {
  get: (name: string) => { value: string } | undefined;
}): boolean {
  return cookies.get(RECOVERY_GRANT_COOKIE)?.value === "1";
}
