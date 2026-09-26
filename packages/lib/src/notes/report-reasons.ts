/**
 * Why a recipient reports a note somebody shared with them, as the site, the
 * app and the console word it. The values are the database's
 * (NoteReportReason); a test in apps/web checks they match.
 */
export const NOTE_REPORT_REASON_LABELS = {
  HATE: "Propos insultants ou haineux",
  SEXUAL: "Contenu sexuel",
  SPAM: "Spam ou publicité",
  PERSONAL_DATA: "Informations personnelles sur quelqu'un",
  OTHER: "Autre chose",
} as const;

export type NoteReportReasonKey = keyof typeof NOTE_REPORT_REASON_LABELS;

/** In the order the forms list them. */
export const NOTE_REPORT_REASON_KEYS: readonly NoteReportReasonKey[] = [
  "HATE",
  "SEXUAL",
  "SPAM",
  "PERSONAL_DATA",
  "OTHER",
];

/** A comment is optional and short: it is read by the team, never by the author. */
export const NOTE_REPORT_COMMENT_MAX = 500;

/** What the reporter reads once it is sent: the note has left their list too. */
export const NOTE_REPORT_SENT =
  "Signalement envoyé. La note a été retirée de tes notes reçues, et l'équipe va la relire.";
