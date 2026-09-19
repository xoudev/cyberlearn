import { env } from "./env";

/**
 * Links that leave the console and land in somebody else's inbox.
 *
 * Six of them exist: the appeal of a ban, the detail of a moderation decision,
 * a ticket's page, a profile after being enrolled in a class, and the sign-up
 * form of an invitation. Every one is read by a learner, none of them may point
 * at the console - an admin URL in a learner's mail is a 403 at best, and at
 * worst a page that tells them a console exists.
 *
 * They were six separate template strings over NEXT_PUBLIC_SITE_URL. Written
 * out each time, nothing said what that variable was for, and nothing noticed
 * when it held the console's own address: the mails kept going out, with a
 * button nobody who received it could open.
 */

/** Same site, ignoring a trailing slash or a differing path. */
function sameOrigin(one: string, other: string): boolean {
  try {
    return new URL(one).origin === new URL(other).origin;
  } catch {
    // An unparseable URL is a configuration problem of its own, and the env
    // schema already refuses it. Not equal is the safe answer here.
    return false;
  }
}

/**
 * True when the console has been handed its own address as the learner site.
 *
 * Kept exported and pure so the check can be read and tested without booting
 * an app around it.
 */
export function isSelfReferential(siteUrl: string, adminUrl: string): boolean {
  return sameOrigin(siteUrl, adminUrl);
}

/**
 * The learner site's URL for `path`.
 *
 * Throws when the two URLs are the same site. A misconfigured deployment used
 * to be invisible - the only symptom was a recipient clicking a button and
 * landing somewhere they have no business being - so it stops the mail instead
 * of sending a broken one. A refused send is reported; a wrong link is not.
 */
export function learnerUrl(path: string): string {
  const site = env.NEXT_PUBLIC_SITE_URL;
  if (isSelfReferential(site, env.NEXT_PUBLIC_ADMIN_URL)) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL points at the admin console. It must be the learner site, " +
        "because it is what recipients of our e-mails click on.",
    );
  }
  return `${site.replace(/\/$/u, "")}${path}`;
}

/** The learner site's root, for the footers that just need the address. */
export function learnerSiteUrl(): string {
  return learnerUrl("");
}
