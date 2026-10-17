import {
  recallAnswerReplySchema,
  recallReplySchema,
  type RecallAnswerReply,
  type RecallPassage,
  type RecallQuestion,
  type RecallResult,
  type RecallVerdict,
  type RecallView,
} from "@cyberlearn/types";
import { quizAnchor, SECTION_PARAM, sectionFromQuery } from "@cyberlearn/lib/revisions/passage";
import type { RecallState } from "@cyberlearn/lib/revisions/recall-copy";

/**
 * "Rappel du jour" and "Réviser ce module" in the app: the site's service
 * draws the questions, checks every answer and credits the XP
 * (/api/mobile/review-cards, apps/web/lib/revisions/daily-recall.ts); this
 * reads its replies, follows a run question by question and finds the way
 * back to a passage. Pure, so it runs under Vitest.
 */

export type {
  RecallAnswerReply,
  RecallPassage,
  RecallQuestion,
  RecallResult,
  RecallVerdict,
  RecallView,
};

/** The route both screens read and answer through. */
export const REVIEW_CARDS_PATH = "/api/mobile/review-cards";

/** Said when the questions could not be loaded or their reply not read. */
export const RECALL_LOAD_FAILED = "Chargement impossible. Réessaie dans un moment.";
/** Said when an answer could not be sent, or the server's verdict not read. */
export const RECALL_SEND_FAILED = "Envoi impossible. Réessaie dans un moment.";

// ── Replies ───────────────────────────────────────────────────────────────────

/** GET's body read back: the questions, or why there are none. Never half a view. */
export function readRecallReply(
  body: unknown,
): { ok: true; recall: RecallView } | { ok: false; error: string } {
  const parsed = recallReplySchema.safeParse(body);
  return parsed.success ? parsed.data : { ok: false, error: RECALL_LOAD_FAILED };
}

/**
 * POST's body read back: the verdict, or the server's reason for recording
 * nothing. Null when it is neither: the answer may not have arrived, and the
 * question stays on screen to be answered again.
 */
export function readRecallAnswer(body: unknown): RecallAnswerReply | null {
  const parsed = recallAnswerReplySchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}

/** GET's address for a module's review: module 2 of `linux-fondamentaux`. */
export function moduleReviewPath(slug: string, moduleNumber: number): string {
  return `${REVIEW_CARDS_PATH}?path=${encodeURIComponent(slug)}&module=${String(moduleNumber)}`;
}

/** What an answer to a module's review sends: the draw is worked out again on the server. */
export interface ModuleAnswer {
  path: string;
  module: number;
  day: string;
  index: number;
  lessonId: string;
  quizId: string;
  selected: number;
}

/** The body of an answer to a module's review; null for a view that names no module. */
export function moduleAnswerBody(
  view: RecallView,
  question: RecallQuestion,
  selected: number,
): ModuleAnswer | null {
  if (view.mode !== "module" || view.module === null) return null;
  return {
    path: view.module.path,
    module: view.module.number,
    day: view.day,
    index: question.index,
    lessonId: question.lessonId,
    quizId: question.quizId,
    selected,
  };
}

// ── The home tab's card ───────────────────────────────────────────────────────

/**
 * Where the day's recall stands, as the site's dashboard says it: to do,
 * done, or nothing to ask. Null when there is no card at all: spaced
 * repetition switched off (a switch that leaves the surface in place reads
 * as a switch that did nothing), or nothing read yet. Never a count.
 */
export function recallCardState(view: RecallView | undefined): RecallState | null {
  if (view === undefined || view.mode !== "daily" || view.status === "off") return null;
  if (view.status === "open") return "todo";
  if (view.status === "done") return "done";
  return "empty";
}

/**
 * The day's recall as it stands after an answer, for the home tab's card and
 * the screen that share it: the verdict in, and the hand-in when this answer
 * was the last.
 */
export function withVerdict(
  view: RecallView,
  verdict: RecallVerdict,
  result: RecallResult | null,
): RecallView {
  const verdicts = [...view.verdicts.filter((v) => v.index !== verdict.index), verdict];
  return result === null ? { ...view, verdicts } : { ...view, verdicts, status: "done", result };
}

// ── A run, question by question ───────────────────────────────────────────────

/**
 * What the screen keeps of a run besides the server's view: the verdicts
 * given here (a module's review keeps them nowhere else), the hand-in, and
 * the questions a module's review could not check and set aside. Kept for
 * the day it was drawn: a view of another day starts afresh.
 */
export interface RecallRun {
  day: string;
  verdicts: RecallVerdict[];
  result: RecallResult | null;
  dropped: number[];
}

export function emptyRun(day: string): RecallRun {
  return { day, verdicts: [], result: null, dropped: [] };
}

/** The run of this view's day, a fresh one for any other. */
function runOf(view: RecallView, run: RecallRun): RecallRun {
  return run.day === view.day ? run : emptyRun(view.day);
}

/** The run after an answer: its verdict, and the hand-in when it was the last. */
export function runWith(
  view: RecallView,
  run: RecallRun,
  verdict: RecallVerdict,
  result: RecallResult | null,
): RecallRun {
  const kept = runOf(view, run);
  return {
    ...kept,
    verdicts: [...kept.verdicts.filter((v) => v.index !== verdict.index), verdict],
    result: result ?? kept.result,
  };
}

/** The run with a question a module's review could not check set aside. */
export function runWithout(view: RecallView, run: RecallRun, index: number): RecallRun {
  const kept = runOf(view, run);
  return kept.dropped.includes(index) ? kept : { ...kept, dropped: [...kept.dropped, index] };
}

/** The first question without an answer, by drawn index; null once all have one. */
export function firstOpen(
  questions: readonly RecallQuestion[],
  verdicts: readonly RecallVerdict[],
): number | null {
  const answered = new Set(verdicts.map((verdict) => verdict.index));
  return questions.find((q) => !answered.has(q.index))?.index ?? null;
}

export interface RecallFlow {
  /** The questions asked, in the order drawn. */
  questions: RecallQuestion[];
  /** Every answer given: those the server holds, then those given here. */
  verdicts: RecallVerdict[];
  /** The first question still open; null once all are answered. */
  next: number | null;
  /**
   * How it went, once it is over: the day's recall handed in, or a module's
   * review tallied here (nothing is handed in, nothing earned). Null before.
   */
  result: RecallResult | null;
}

/** The view and the run together: what is asked, what is answered, how it went. */
export function recallFlow(view: RecallView, run: RecallRun): RecallFlow {
  const kept = runOf(view, run);
  const questions = view.questions.filter((q) => !kept.dropped.includes(q.index));
  const held = new Set(view.verdicts.map((v) => v.index));
  const verdicts = [...view.verdicts, ...kept.verdicts.filter((v) => !held.has(v.index))];
  const next = firstOpen(questions, verdicts);
  const tally: RecallResult | null =
    view.mode === "module" && questions.length > 0 && next === null
      ? { correct: verdicts.filter((v) => v.correct).length, total: verdicts.length, xp: 0 }
      : null;
  return { questions, verdicts, next, result: view.result ?? kept.result ?? tally };
}

/**
 * The question on screen. `pinned` is the one the reader is on: kept while
 * it is still asked, so its verdict stays in view after the answer, and so a
 * question refused and read back again shows the verdict given elsewhere;
 * gone from the view, the first open question takes its place. Undefined
 * before the reader picks anything; null once they moved on to the end.
 */
export function shownQuestion(flow: RecallFlow, pinned: number | null | undefined): number | null {
  if (pinned === null) return null;
  if (pinned !== undefined && flow.questions.some((q) => q.index === pinned)) return pinned;
  return flow.next;
}

// ── "Revoir ce passage" ───────────────────────────────────────────────────────

/** The lesson screen, on the section a question comes from. */
export interface PassageRoute {
  pathname: "/lessons/[slug]";
  params: { slug: string; section?: string; quiz?: string };
}

const PASSAGE = /^\/lessons\/([^/?#]+)(?:\?([^#]*))?(?:#(.*))?$/u;
const SLUG = /^[a-z0-9-]+$/u;
const SECTION = new RegExp(`(?:^|&)${SECTION_PARAM}=(\\d{1,3})(?:&|$)`, "u");
const QUIZ_PREFIX = quizAnchor("");

function decoded(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/**
 * The site's link to a passage (/lessons/<slug>?section=<n>#quiz-<id>,
 * @cyberlearn/lib/revisions/passage) as the lesson screen opens it: the
 * slug, the section the site counted, and the question, which the screen
 * looks for in its own sections. Null for a link that is not to a lesson.
 */
export function passageRoute(href: string): PassageRoute | null {
  const match = PASSAGE.exec(href);
  const slug = decoded(match?.[1] ?? "");
  if (match === null || slug === null || !SLUG.test(slug)) return null;
  const section = SECTION.exec(match[2] ?? "")?.[1];
  const anchor = decoded(match[3] ?? "") ?? "";
  const quiz =
    anchor.startsWith(QUIZ_PREFIX) && anchor.length > QUIZ_PREFIX.length
      ? anchor.slice(QUIZ_PREFIX.length)
      : undefined;
  return {
    pathname: "/lessons/[slug]",
    params: {
      slug,
      ...(section !== undefined ? { section } : {}),
      ...(quiz !== undefined ? { quiz } : {}),
    },
  };
}

/** What a lesson screen was asked to open on, from its address. */
export interface PassageRequest {
  section?: string | string[];
  quiz?: string | string[];
}

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The section of the lesson a passage asks for, from 0; null when the
 * address asks for none. The section that holds the question first: the
 * app cuts a lesson into sections its own way (an introduction before the
 * first heading is a section here, part of the first on the site), so the
 * site's number is only the fallback, and the first section after that.
 */
export function passageSection(
  sections: readonly { blocks: readonly { kind: string }[] }[],
  request: PassageRequest,
): number | null {
  const quiz = single(request.quiz);
  const section = single(request.section);
  if (quiz === undefined && section === undefined) return null;
  if (quiz !== undefined) {
    const found = sections.findIndex((s) =>
      s.blocks.some((block) => block.kind === "quiz" && "id" in block && block.id === quiz),
    );
    if (found >= 0) return found;
  }
  return sectionFromQuery(section, sections.length);
}

// ── "Réviser ce module" on the path screen ───────────────────────────────────

/**
 * Whether a module has something to review: its review asks about the
 * lessons finished, so a module none of whose lessons is finished offers
 * nothing, as on the site's path page.
 */
export function moduleReviewable(
  missions: readonly { status: string | null }[],
  indices: readonly number[],
): boolean {
  return indices.some((index) => missions[index]?.status === "COMPLETED");
}
