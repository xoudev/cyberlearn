import { learnerUrl } from "./learner-url";

/**
 * Where somebody writes back to the team from a mail the console sent.
 *
 * Never RESEND_FROM_EMAIL. That is the address mails leave from, and every
 * documented setup makes it noreply@: the second-factor notice and the
 * deletion notice both handed it out as the address to write to, so the one
 * reader whose alert mattered most - an account owner who asked for nothing -
 * wrote into a mailbox nobody reads.
 */

/** The address the privacy policy publishes, for anything about one's data. */
export const PRIVACY_CONTACT_EMAIL = "privacy@cyberlearn.fr";

/**
 * The site's contact form, already on the security theme and subject, for an
 * owner whose second factor was removed without their asking. It works signed
 * out, which may be exactly where they are, and it lands in the console's
 * tickets as a critical one.
 */
export function securityContactUrl(): string {
  const query = new URLSearchParams({
    theme: "SECURITY",
    subject: "Double authentification retirée sans ma demande",
  });
  return learnerUrl(`/contact?${query.toString()}`);
}
