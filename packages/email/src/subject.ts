/**
 * Why every subject on this platform is different from the last one.
 *
 * Mail clients group messages into a conversation when they come from the same
 * sender under the same subject. That is the right behaviour for a reply on a
 * ticket and the wrong one for everything else: six login links, six lessons
 * handed out, six moderation notices all collapsed into one row where only the
 * newest is visible and the other five are a disclosure triangle away.
 *
 * There are two ways for a subject to be its own, and a template should prefer
 * the first:
 *
 *   1. Name the thing. A lesson has a title, a ticket has a subject, a class
 *      has a name. "Nouvelle leçon : Injections SQL" distinguishes itself from
 *      the next one and tells the reader what it is before they open it.
 *
 *   2. Stamp the moment, when there is nothing to name. Two login links differ
 *      in no way a reader cares about except which one is the fresh one - so
 *      that is what the subject says.
 *
 * What is deliberately NOT stamped: a reply on a ticket. Those really are one
 * conversation and grouping them is the client doing its job.
 *
 * The code is never put in the subject, though it would also break the
 * grouping. A subject is shown on a locked phone, and a one-time code read off
 * a notification is a code that did not need the mailbox it was sent to.
 */

/** Paris, like every other calendar decision the platform makes. */
const STAMP = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

/**
 * "19 sept. à 16:04" - short enough to survive an inbox's truncation, precise
 * enough that two sends a minute apart are two rows.
 */
export function subjectStamp(sentAt: Date): string {
  // fr-FR renders this as "19 sept. 16:04" with a comma or a space depending on
  // the runtime's CLDR data, so the separator is imposed here rather than
  // inherited - a subject that changes shape between Node versions is a subject
  // that threads differently between them.
  const parts = STAMP.formatToParts(sentAt);
  const pick = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("day")} ${pick("month")} à ${pick("hour")}:${pick("minute")}`;
}

/** `base` with the moment appended, for the mails that have nothing to name. */
export function stampedSubject(base: string, sentAt: Date): string {
  return `${base} · ${subjectStamp(sentAt)}`;
}
