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
