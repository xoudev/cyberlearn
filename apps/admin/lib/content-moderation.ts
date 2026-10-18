import type { ContentGesture, ContentSurface } from "@cyberlearn/db";

/**
 * The questions the console asks before it hides, shows again or deletes
 * somebody's content. Each gesture reaches the author, and a deletion cannot
 * be taken back, so the question says what goes with it: a thread with its
 * opening message, a question with its answers.
 */

const THIS: Record<ContentSurface, string> = {
  FORUM_POST: "ce message",
  LESSON_QUESTION: "cette question",
  LESSON_ANSWER: "cette réponse",
  CHALLENGE_WRITEUP: "cette solution",
  CLASS_RESOURCE: "cette ressource",
};

export interface GestureSubject {
  surface: ContentSurface;
  /** A forum message that opens its thread. */
  opensThread: boolean;
  /** The replies of that thread, or the answers of a question. */
  replies: number;
}

/** "sa réponse", "ses 3 réponses". */
function itsReplies(n: number): string {
  return n === 1 ? "sa réponse" : `ses ${String(n)} réponses`;
}

/** What goes with the content when it is deleted, or "" when nothing does. */
function takenAlong(subject: GestureSubject): string {
  if (subject.surface === "FORUM_POST" && subject.opensThread) {
    return subject.replies === 0
      ? " Il ouvre son sujet : le sujet part avec lui."
      : ` Il ouvre son sujet : le sujet part avec lui, et ${itsReplies(subject.replies)}.`;
  }
  if (subject.surface === "LESSON_QUESTION" && subject.replies > 0) {
    const replies = itsReplies(subject.replies);
    const verb = subject.replies === 1 ? "part" : "partent";
    return ` ${replies.charAt(0).toUpperCase()}${replies.slice(1)} ${verb} avec elle.`;
  }
  return "";
}

export function contentGestureQuestion(gesture: ContentGesture, subject: GestureSubject): string {
  const target = THIS[subject.surface];
  if (gesture === "hide") {
    const thread =
      subject.surface === "FORUM_POST" && subject.opensThread
        ? " Il ouvre son sujet : le sujet entier sera masqué."
        : "";
    return `Masquer ${target} ?${thread} Son auteur sera prévenu.`;
  }
  if (gesture === "restore") {
    return `Réafficher ${target} ? Son auteur sera prévenu.`;
  }
  return `Supprimer définitivement ${target} ?${takenAlong(subject)} Rien ne pourra être rétabli, et son auteur sera prévenu.`;
}

/** Shortened for a list: the start of the text, on one line. */
export function contentExcerpt(text: string, max = 220): string {
  const flat = text.replace(/\s+/gu, " ").trim();
  if (flat === "") return "(vide)";
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}
