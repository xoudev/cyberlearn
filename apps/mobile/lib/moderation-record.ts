/**
 * The reader's own moderation record in the app: the site's
 * /settings/moderation, with the same words (@cyberlearn/lib/moderation/record
 * and the surface nouns of the notices). The server decides what the reader is
 * shown about themselves; this module only words it.
 */

export type { ModerationEvent } from "./api";
export { surfaceNoun } from "@cyberlearn/lib/moderation/notice";
export {
  MODERATION_RECORD_EMPTY,
  MODERATION_RECORD_INTRO,
  moderationOutcome,
} from "@cyberlearn/lib/moderation/record";

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/**
 * "20 septembre 2026 à 12:00", in the phone's own time zone: the site's long
 * date and short time (Intl, fr-FR, dateStyle long, timeStyle short), written
 * out because not every phone's JavaScript engine has those two options.
 */
export function recordStamp(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${String(d.getDate())} ${MONTHS[d.getMonth()] ?? ""} ${String(d.getFullYear())} à ${hh}:${mm}`;
}
