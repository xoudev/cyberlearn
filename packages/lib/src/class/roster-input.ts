import { usernameSchema } from "@cyberlearn/types";

/**
 * What somebody typed into the roster box, sorted into what it can mean.
 *
 * The box used to accept one thing, addresses, and treat every token it could
 * not resolve as an address to invite. Nothing checked that a token was an
 * address at all, so `@amelie` became a pending invitation to `@amelie` - a row
 * in the class that nobody can ever claim, because an invitation is taken up by
 * signing up with that address and no address is spelled that way. The word
 * `bonjour` did the same. Both were then reported as "invitation enregistrée
 * mais e-mail non envoyé", which reads like a mail problem and is not one.
 *
 * So the routing is explicit, and it turns on the leading @:
 *
 *   @handle  an account, by the name it chose. Looked up; if there is none,
 *            that is an error and nothing is held - a username cannot be
 *            invited, because signing up does not claim one.
 *   address  an account, by the address it signs in with. Looked up; if there
 *            is none, an invitation holds the place, which is the one case
 *            where holding a place makes sense.
 *   neither  reported back to whoever typed it. Never turned into anything.
 *
 * Requiring the @ rather than guessing is what keeps the errors honest: a bare
 * `amelie` could be a handle or a mistyped address, and a parser that picks one
 * ends up saying "no account named amelie" to somebody who mistyped their
 * student's e-mail.
 */

export interface RosterInput {
  /** Lower-cased addresses, in the order they were typed. */
  emails: string[];
  /** Lower-cased handles, without the @. */
  handles: string[];
  /** Tokens that are neither, kept verbatim so the message can quote them. */
  invalid: string[];
}

/**
 * A gate against tokens that are plainly not addresses, not an RFC 5322
 * implementation - which is a thing worth not writing. Everything past here is
 * still only a candidate: whether an address exists is the database's answer,
 * and whether it can receive mail is Resend's.
 */
const LOOKS_LIKE_AN_ADDRESS = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/u;

/** One pasted class list, with room to spare. */
export const ROSTER_INPUT_LIMIT = 200;

export function parseRosterInput(raw: string, limit: number = ROSTER_INPUT_LIMIT): RosterInput {
  const tokens = [
    ...new Set(
      raw
        .split(/[\s,;]+/u)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0),
    ),
  ].slice(0, limit);

  const emails: string[] = [];
  const handles: string[] = [];
  const invalid: string[] = [];

  for (const token of tokens) {
    if (token.startsWith("@")) {
      const handle = token.slice(1);
      // The product's own rule, imported rather than restated: a parser with
      // its own idea of a username accepts names that cannot exist, and then
      // reports them as accounts that were not found.
      if (usernameSchema.safeParse(handle).success) handles.push(handle);
      else invalid.push(token);
    } else if (LOOKS_LIKE_AN_ADDRESS.test(token)) {
      emails.push(token);
    } else {
      invalid.push(token);
    }
  }

  return { emails, handles, invalid };
}
