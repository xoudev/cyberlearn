/**
 * An account whose address was never confirmed, told apart from a wrong
 * password.
 *
 * Both used to get the same sentence ("identifiants incorrects ou adresse non
 * vérifiée"), so somebody whose confirmation mail went to spam had nothing to
 * do but retype a password that was right, and no way to ask for the mail
 * again. Supabase only says "not confirmed" after the password has matched, so
 * telling the two apart reveals nothing to somebody who does not hold it.
 *
 * Shared by the site and the app, which both sign in against the same project.
 */

/** The code Supabase Auth gives a password sign-in on an unconfirmed address. */
export const EMAIL_NOT_CONFIRMED_CODE = "email_not_confirmed";

function stringProperty(value: unknown, property: string): string | null {
  if (typeof value !== "object" || value === null || !(property in value)) return null;
  const found: unknown = Reflect.get(value, property);
  return typeof found === "string" ? found : null;
}

/**
 * True for the sign-in error of an address that has not been confirmed.
 *
 * Reads the error's `code`, and its message for the servers that predate error
 * codes ("Email not confirmed").
 */
export function isEmailNotConfirmedError(error: unknown): boolean {
  if (stringProperty(error, "code") === EMAIL_NOT_CONFIRMED_CODE) return true;
  return stringProperty(error, "message")?.toLowerCase().includes("email not confirmed") ?? false;
}

/** Shown in place of "wrong credentials" when the address is the problem. */
export const EMAIL_NOT_CONFIRMED_MESSAGE =
  "Ton adresse e-mail n’est pas encore confirmée. Ouvre le lien reçu à l’inscription, ou demande un nouvel e-mail.";

/**
 * After a resend. Worded for every case, sent or not: whether an address has
 * an account waiting is not something to tell whoever asks.
 */
export const CONFIRMATION_RESENT_MESSAGE =
  "Si un compte attend sa confirmation à cette adresse, un nouvel e-mail vient de partir. Pense à regarder dans les indésirables.";

export const RESEND_CONFIRMATION_LABEL = "Renvoyer l’e-mail de confirmation";
