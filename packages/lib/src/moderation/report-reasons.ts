import {
  NOTE_REPORT_COMMENT_MAX,
  NOTE_REPORT_REASON_KEYS,
  NOTE_REPORT_REASON_LABELS,
} from "../notes/report-reasons.js";

/**
 * Reporting what somebody published: a forum message, a question or an answer
 * under a lesson, a challenge solution, a class resource. The site, the app
 * and the console word it from here. The values are the database's
 * (ContentReportSurface, ContentReportReason); a test in apps/web checks they
 * match.
 *
 * The reasons are a reported note's, word for word: they describe what is
 * wrong with a text, whoever it was handed to, and two lists that differ by a
 * word would read as two policies.
 */

export const CONTENT_REPORT_SURFACE_KEYS = [
  "FORUM_POST",
  "LESSON_QUESTION",
  "LESSON_ANSWER",
  "CHALLENGE_WRITEUP",
  "CLASS_RESOURCE",
] as const;

export type ContentReportSurfaceKey = (typeof CONTENT_REPORT_SURFACE_KEYS)[number];

/** Whether a string read from a URL or a form names one of the surfaces. */
export function isContentReportSurface(value: string): value is ContentReportSurfaceKey {
  return (CONTENT_REPORT_SURFACE_KEYS as readonly string[]).includes(value);
}

/** What the content is called in a sentence: "Signaler ce message". */
export const CONTENT_REPORT_TARGET: Record<ContentReportSurfaceKey, string> = {
  FORUM_POST: "ce message",
  LESSON_QUESTION: "cette question",
  LESSON_ANSWER: "cette réponse",
  CHALLENGE_WRITEUP: "cette solution",
  CLASS_RESOURCE: "cette ressource",
};

/** What the console calls each surface, in its lists and its tabs. */
export const CONTENT_SURFACE_LABEL: Record<ContentReportSurfaceKey, string> = {
  FORUM_POST: "Message du forum",
  LESSON_QUESTION: "Question sous une leçon",
  LESSON_ANSWER: "Réponse sous une leçon",
  CHALLENGE_WRITEUP: "Solution d'un défi",
  CLASS_RESOURCE: "Ressource de classe",
};

/**
 * The surface as the moderation notices know it (`surfaceNoun`): the console
 * tells an author "ta question n'est plus visible" in the words the screen's
 * own notices use.
 */
export const CONTENT_NOTICE_SURFACE: Record<ContentReportSurfaceKey, string> = {
  FORUM_POST: "forum.post",
  LESSON_QUESTION: "lesson.question",
  LESSON_ANSWER: "lesson.answer",
  CHALLENGE_WRITEUP: "challenge.writeup",
  CLASS_RESOURCE: "class.resource",
};

export const CONTENT_REPORT_REASON_LABELS = NOTE_REPORT_REASON_LABELS;

export type ContentReportReasonKey = keyof typeof CONTENT_REPORT_REASON_LABELS;

/** In the order the forms list them. */
export const CONTENT_REPORT_REASON_KEYS: readonly ContentReportReasonKey[] =
  NOTE_REPORT_REASON_KEYS;

/** A comment is optional and short: it is read by the team, never by the author. */
export const CONTENT_REPORT_COMMENT_MAX = NOTE_REPORT_COMMENT_MAX;

/** The button's spoken name, in the place of the content it reports. */
export function contentReportLabel(surface: ContentReportSurfaceKey): string {
  return `Signaler ${CONTENT_REPORT_TARGET[surface]}`;
}

/** The question the form asks above the reasons. */
export function contentReportQuestion(surface: ContentReportSurfaceKey): string {
  return `Pourquoi signaler ${CONTENT_REPORT_TARGET[surface]} ?`;
}

/**
 * What the reporter reads once it is sent. Unlike a note, nothing leaves their
 * screen: the content is everybody's, and it stays until the team has read it.
 */
export const CONTENT_REPORT_SENT =
  "Merci, ton signalement est envoyé. L'équipe va relire ce contenu ; son auteur ne saura pas qui l'a signalé.";

/** Under the form, before it is sent. */
export const CONTENT_REPORT_PRIVACY =
  "Ton signalement va à l'équipe de modération. L'auteur ne saura pas qui l'a envoyé.";
