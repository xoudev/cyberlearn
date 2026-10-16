import { first, type RawParams } from "./grid-params";

/**
 * What deleting an account has to say once its page no longer exists.
 *
 * The deletion used to answer on the account's own page. Revalidating any
 * path re-renders the page the action was called from, that page found no row
 * and called notFound(), and the administrator landed on Next's default 404 -
 * without the confirmation, and without the two warnings that ask for
 * something to be done by hand. The action now sends them back to the list,
 * and the list reads what happened from its address.
 *
 * Flags only, never the person: a name or an address in a URL outlives the
 * erasure in the browser history and the server logs.
 */

export interface DeletionNotice {
  /** The notice to the person could not be delivered. */
  emailFailed: boolean;
  /** The Supabase Auth identity outlived the profile and is still to remove. */
  authSurvived: boolean;
}

/** The parameter the users list reads. */
export const DELETED_PARAM = "supprime";

const EMAIL_FAILED = "mail";
const AUTH_SURVIVED = "auth";
const CLEAN = "ok";

/** Where the deletion form sends the administrator once the account is gone. */
export function deletedAccountHref(notice: DeletionNotice): string {
  const flags = [
    ...(notice.emailFailed ? [EMAIL_FAILED] : []),
    ...(notice.authSurvived ? [AUTH_SURVIVED] : []),
  ];
  const value = flags.length === 0 ? CLEAN : flags.join("-");
  return `/users?${new URLSearchParams({ [DELETED_PARAM]: value }).toString()}`;
}

/**
 * The notice the list shows, or null. Anything else in the parameter is
 * dropped like any other value the URL could be typed with.
 */
export function readDeletionNotice(params: RawParams): DeletionNotice | null {
  const value = first(params, DELETED_PARAM);
  if (value === undefined) return null;
  const flags = value.split("-");
  if (!flags.every((flag) => flag === CLEAN || flag === EMAIL_FAILED || flag === AUTH_SURVIVED)) {
    return null;
  }
  return { emailFailed: flags.includes(EMAIL_FAILED), authSurvived: flags.includes(AUTH_SURVIVED) };
}
