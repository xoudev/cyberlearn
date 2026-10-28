import { z } from "zod";
import {
  pathRepository,
  prisma,
  reviewCardRepository,
  userRepository,
  type ReviewLessonRow,
  type ReviewSessionRow,
} from "@cyberlearn/db";
import { dayKey, registerActivity } from "@cyberlearn/lib";
import { sourceKey, type MockRef, type MockSource } from "@cyberlearn/lib/exam/mock";
import { quizSections } from "@cyberlearn/lib/mdx-quizzes";
import { groupIntoModules, moduleLabel } from "@cyberlearn/lib/paths/modules";
import {
  drawModuleReview,
  drawReviewSession,
  isSessionAnswered,
  orphanCards,
  REVIEW_SESSION_XP,
  reviewOptionOrder,
  reviewQuestions,
} from "@cyberlearn/lib/revisions/cards";
import { passageHref } from "@cyberlearn/lib/revisions/passage";
import { checkDuelAnswer } from "@cyberlearn/lib/social/duel";
import { quizSourcesOf } from "@/lib/exam/quiz-sources";
import { revisionsEnabled } from "@/lib/lessons/revisions-enabled";
import { evaluateAndAwardBadges } from "@/lib/badges/award";
import { recordQuestProgress } from "@/lib/quests/progress";
import { creditXp } from "@/lib/xp/credit";

/**
 * "Rappel du jour" and "Réviser ce module": lesson quiz questions asked
 * again, each answer checked on the server as a duel's is (draw and check in
 * @cyberlearn/lib/social/duel and revisions/cards), with the explanation and
 * the way back to the passage once answered.
 *
 * - The day's recall asks the review cards due (reviewCardRepository), six at
 *   most, drawn once a day and stored with their option order. Each answer
 *   is final and moves its card; the last one hands the session in, which
 *   earns REVIEW_SESSION_XP once (XP ledger, source REVIEW) and counts as the
 *   day's activity for the streak and its weekly quest.
 * - A module's review asks six questions at most from the module's lessons
 *   the learner finished, on demand. Nothing is stored, no card moves, no XP:
 *   the draw comes out the same for the day, and an answer is checked by
 *   working its option order out again.
 *
 * Shared by the site (the ?rappel= window and its actions) and the app
 * (/api/mobile/review-cards). Callers are responsible for AUTHENTICATION:
 * `userId` must be a verified identity. Lives outside any "use server" module
 * so it cannot be invoked with an arbitrary userId.
 */

/** A question as the learner is shown it: no answer key. */
export interface RecallQuestion {
  /** Its place in the draw, sent back with the answer to the day's recall. */
  index: number;
  /** The question's lesson and quiz, sent back with the answer to a module's review. */
  lessonId: string;
  quizId: string;
  lessonTitle: string;
  question: string;
  /** In the order shown. */
  options: string[];
}

/** "Revoir ce passage": the lesson, on the section the question is in. */
export interface RecallPassage {
  lessonTitle: string;
  href: string;
}

/** The verdict on one answer, given once it is final. */
export interface RecallVerdict {
  index: number;
  /** The shown option picked. */
  selected: number;
  correct: boolean;
  /** The shown option that was right. */
  correctIndex: number;
  explanation: string | null;
  passage: RecallPassage | null;
}

/** A recall handed in: right answers out of those given, and the XP it earned. */
export interface RecallResult {
  correct: number;
  total: number;
  xp: number;
}

/**
 * What the window shows.
 *
 * - `off`: spaced repetition is switched off in the settings (the day's recall only).
 * - `empty`: nothing to ask today, or nothing yet in this module.
 * - `open`: questions to answer; `verdicts` holds the ones answered already.
 * - `done`: the day's recall is handed in; `result` says how it went.
 * - `missing`: no such module for this reader.
 */
export interface RecallView {
  mode: "daily" | "module";
  status: "off" | "empty" | "open" | "done" | "missing";
  /** The day the questions were drawn for (a day key). */
  day: string;
  /** "Rappel du jour", or the module ("Module 02 · Les permissions"). */
  title: string;
  /** A module's review: which one, to send back with each answer. */
  module: { path: string; number: number } | null;
  questions: RecallQuestion[];
  verdicts: RecallVerdict[];
  result: RecallResult | null;
}

export type RecallAnswerResult =
  | {
      ok: true;
      verdict: RecallVerdict;
      /** Set when this answer handed the day's recall in. */
      result: RecallResult | null;
    }
  | { ok: false; error: string };

export const DAILY_RECALL_TITLE = "Rappel du jour";

const INVALID = "Réponse invalide.";
const OFF = "La répétition espacée est coupée dans tes réglages.";
// Said over today's recall as well: the window reads it back on a refusal.
const NOT_TODAY = "Ce rappel n'est plus celui du jour.";
const DONE = "Tu as déjà fait le rappel du jour.";
const GONE = "Cette question n'est plus disponible.";
const ANSWERED = "Tu as déjà répondu à cette question.";
const NO_MODULE = "Ce module n'est plus disponible.";

/** How many due cards a draw looks at: the most overdue, enough for six from three lessons and more. */
const DRAW_WINDOW = 60;

const selected = z.number().int().min(0).max(25);
const dailyAnswerSchema = z.object({ index: z.number().int().min(0).max(50), selected });
const moduleSchema = z.object({
  path: z.string().trim().min(1).max(120),
  module: z.coerce.number().int().min(1).max(99),
});
const moduleAnswerSchema = moduleSchema.extend({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  index: z.number().int().min(0).max(50),
  lessonId: z.guid(),
  quizId: z.string().min(1).max(100),
  selected,
});

// ── Reading questions and answers ─────────────────────────────────────────────

/** The quizzes of these lessons, each shown under its lesson's title. */
function sourcesOf(lessons: readonly ReviewLessonRow[]): Map<string, MockSource> {
  return quizSourcesOf(lessons, (lesson) => lesson.title);
}

/** Where each lesson's quizzes are, read once a lesson for the passages. */
class Passages {
  private readonly lessons: ReadonlyMap<string, ReviewLessonRow>;
  private readonly sections = new Map<string, Map<string, number>>();

  constructor(lessons: readonly ReviewLessonRow[]) {
    this.lessons = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  }

  of(lessonId: string, quizId: string): RecallPassage | null {
    const lesson = this.lessons.get(lessonId);
    if (lesson === undefined) return null;
    let sections = this.sections.get(lessonId);
    if (sections === undefined) {
      sections = quizSections(lesson.contentMdx);
      this.sections.set(lessonId, sections);
    }
    return {
      lessonTitle: lesson.title,
      href: passageHref(lesson.slug, sections.get(quizId) ?? null, quizId),
    };
  }
}

function questionsOf(
  draw: readonly MockRef[],
  sources: ReadonlyMap<string, MockSource>,
): RecallQuestion[] {
  return reviewQuestions(draw, sources).flatMap((q): RecallQuestion[] => {
    const ref = draw[q.index];
    if (ref === undefined) return [];
    return [
      {
        index: q.index,
        lessonId: ref.lessonId,
        quizId: ref.quizId,
        lessonTitle: q.domain,
        question: q.question,
        options: q.options,
      },
    ];
  });
}

/** The verdict on an answer to `ref`, or null when its question went or changed. */
function verdictOf(
  index: number,
  ref: MockRef,
  pick: number,
  sources: ReadonlyMap<string, MockSource>,
  passages: Passages,
): RecallVerdict | null {
  const checked = checkDuelAnswer(ref, sources, pick);
  if (checked === null) return null;
  return {
    index,
    selected: pick,
    correct: checked.correct,
    correctIndex: checked.correctIndex,
    explanation: sources.get(sourceKey(ref.lessonId, ref.quizId))?.explanation ?? null,
    passage: passages.of(ref.lessonId, ref.quizId),
  };
}

function verdictsOf(
  session: Pick<ReviewSessionRow, "draw" | "answers">,
  sources: ReadonlyMap<string, MockSource>,
  passages: Passages,
): RecallVerdict[] {
  return session.draw.flatMap((ref, index): RecallVerdict[] => {
    const pick = session.answers[String(index)];
    if (pick === undefined) return [];
    const verdict = verdictOf(index, ref, pick, sources, passages);
    return verdict === null ? [] : [verdict];
  });
}

function resultOf(verdicts: readonly RecallVerdict[], xpCredited: boolean): RecallResult {
  return {
    correct: verdicts.filter((verdict) => verdict.correct).length,
    total: verdicts.length,
    xp: xpCredited ? REVIEW_SESSION_XP : 0,
  };
}

// ── The day's recall ──────────────────────────────────────────────────────────

/**
 * Draws the day's session and stores it, or null when nothing is due. The
 * cards the thirty-day rule retires and those whose question is gone from
 * its lesson are retired on the way: written down here, at the one moment
 * they are looked at.
 *
 * Cards due and not one question to ask: each is in a lesson that yields no
 * quiz now, whose cards are kept for when it is mended (orphanCards). The day
 * is stored all the same, empty and handed in, without XP: the window, the
 * dashboard and the reminder then say for the rest of the day what the draw
 * found, that there is nothing to ask.
 */
async function drawToday(userId: string, day: string, now: Date): Promise<ReviewSessionRow | null> {
  await reviewCardRepository.retireStale(userId, now);
  const due = await reviewCardRepository.findDue(userId, now, DRAW_WINDOW);
  if (due.length === 0) return null;
  const sources = sourcesOf(await reviewCardRepository.findLessons(due.map((c) => c.lessonId)));
  const quizIds = new Map<string, Set<string>>();
  for (const source of sources.values()) {
    const ids = quizIds.get(source.lessonId) ?? new Set<string>();
    ids.add(source.quizId);
    quizIds.set(source.lessonId, ids);
  }
  await reviewCardRepository.retire(
    userId,
    orphanCards(due, quizIds).map((card) => card.id),
    now,
  );
  const draw = drawReviewSession(due, sources, userId, day);
  // A second tab drawing at the same moment gets the session stored first.
  return reviewCardRepository.createSession(userId, day, draw, draw.length === 0 ? now : null);
}

/**
 * Hands the session in with its answers and credits it: REVIEW_SESSION_XP
 * through the XP ledger, and the day counted for the streak, once. False
 * when another request handed it in first; nothing is credited twice.
 */
async function handIn(
  userId: string,
  sessionId: string,
  answers: Readonly<Record<string, number>>,
  now: Date,
): Promise<boolean> {
  const user = await userRepository.findForGamification(userId);
  if (user === null) return false;
  // The day's activity, as a lesson or a challenge counts it.
  const streak = registerActivity(
    {
      currentStreak: user.streakDays,
      longestStreak: user.longestStreak,
      lastActiveDay: dayKey(user.lastActiveAt),
      freezes: user.streakFreezes,
    },
    now,
  ).state;
  const today = new Date(dayKey(now));

  const credited = await prisma.$transaction(async (tx) => {
    if (!(await reviewCardRepository.completeSession(sessionId, answers, now, tx))) return false;
    if (!(await reviewCardRepository.claimSessionXp(sessionId, tx))) return false;
    await tx.user.update({
      where: { id: userId },
      data: {
        streakDays: streak.currentStreak,
        longestStreak: streak.longestStreak,
        streakFreezes: streak.freezes,
        lastActiveAt: now,
      },
    });
    await tx.userActivityDay.upsert({
      where: { userId_day: { userId, day: today } },
      create: { userId, day: today, count: 1 },
      update: { count: { increment: 1 } },
    });
    await creditXp(tx, userId, REVIEW_SESSION_XP, "REVIEW");
    return true;
  });
  // Weekly quests: the day's recall counts once, and keeps the streak quest
  // moving too.
  if (credited) {
    await recordQuestProgress(userId, "DAILY_RECALL", now, { amount: 1 });
    await recordQuestProgress(userId, "STREAK_DAYS", now, { setTo: streak.currentStreak });
  }

  // Badges: the recalls handed in.
  if (credited) await evaluateAndAwardBadges(userId, ["DAILY_RECALLS"], { day: dayKey(now) });
  return credited;
}

function dailyView(day: string): RecallView {
  return {
    mode: "daily",
    status: "empty",
    day,
    title: DAILY_RECALL_TITLE,
    module: null,
    questions: [],
    verdicts: [],
    result: null,
  };
}

/**
 * The day's recall as the learner opens it: drawn on the first opening of
 * the day, or by the dashboard before it (dailyRecallState), then the same
 * questions all day, with the answers given so far.
 */
export async function openDailyRecall(userId: string, now: Date = new Date()): Promise<RecallView> {
  const day = dayKey(now);
  const base = dailyView(day);
  if (!(await revisionsEnabled(userId))) return { ...base, status: "off" };

  let session =
    (await reviewCardRepository.findSession(userId, day)) ?? (await drawToday(userId, day, now));
  // Nothing due, or nothing to ask of the cards due (drawToday).
  if (session === null || session.draw.length === 0) return base;

  const lessons = await reviewCardRepository.findLessons(session.draw.map((ref) => ref.lessonId));
  const sources = sourcesOf(lessons);
  // Every answer given, but not handed in: the request with the last answer
  // stopped between the two, or the last question still to answer went from
  // its lesson. Handed in now, once.
  if (session.completedAt === null && isSessionAnswered(session.draw, sources, session.answers)) {
    await handIn(userId, session.id, session.answers, now);
    session = (await reviewCardRepository.findSession(userId, day)) ?? session;
  }

  const questions = questionsOf(session.draw, sources);
  const verdicts = verdictsOf(session, sources, new Passages(lessons));
  if (session.completedAt !== null) {
    return {
      ...base,
      status: "done",
      questions,
      verdicts,
      result: resultOf(verdicts, session.xpCredited),
    };
  }
  return { ...base, status: questions.length === 0 ? "empty" : "open", questions, verdicts };
}

/**
 * One answer to the day's recall, checked on the server and final: it moves
 * its card, and the last one hands the session in.
 */
export async function answerDailyRecall(
  userId: string,
  input: unknown,
  now: Date = new Date(),
): Promise<RecallAnswerResult> {
  const parsed = dailyAnswerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID };
  if (!(await revisionsEnabled(userId))) return { ok: false, error: OFF };
  const { index } = parsed.data;
  const pick = parsed.data.selected;

  const day = dayKey(now);
  const session = await reviewCardRepository.findSession(userId, day);
  if (session === null) return { ok: false, error: NOT_TODAY };
  if (session.completedAt !== null) return { ok: false, error: DONE };
  const ref = session.draw[index];
  if (ref === undefined) return { ok: false, error: INVALID };

  const lessons = await reviewCardRepository.findLessons(session.draw.map((r) => r.lessonId));
  const sources = sourcesOf(lessons);
  const passages = new Passages(lessons);
  const verdict = verdictOf(index, ref, pick, sources, passages);
  if (verdict === null) {
    return { ok: false, error: pick < ref.order.length ? GONE : INVALID };
  }

  const recorded = await prisma.$transaction(async (tx) => {
    if (!(await reviewCardRepository.answerInSession(userId, session.id, index, pick, tx))) {
      return false;
    }
    await reviewCardRepository.applyAnswer(userId, ref, verdict.correct, now, tx);
    return true;
  });
  if (!recorded) return { ok: false, error: ANSWERED };

  // Read again: another tab may have answered the others meanwhile.
  const answers = (await reviewCardRepository.findSession(userId, day))?.answers ?? {
    ...session.answers,
    [String(index)]: pick,
  };
  if (!isSessionAnswered(session.draw, sources, answers)) {
    return { ok: true, verdict, result: null };
  }

  await handIn(userId, session.id, answers, now);
  const handed = await reviewCardRepository.findSession(userId, day);
  const verdicts = verdictsOf({ draw: session.draw, answers }, sources, passages);
  return { ok: true, verdict, result: resultOf(verdicts, handed?.xpCredited ?? false) };
}

/** Where the day's recall stands, as the dashboard says it: no count, ever. */
export type DailyRecallState = "todo" | "done" | "empty";

function stateOf(session: Pick<ReviewSessionRow, "draw" | "completedAt">): DailyRecallState {
  if (session.draw.length === 0) return "empty";
  return session.completedAt === null ? "todo" : "done";
}

/**
 * Whether the day's recall is to do, done, or has nothing to ask, as the
 * window will find it.
 *
 * A card due is not enough to say "to do": whether it has a question to ask
 * is only known by reading its lesson, and a lesson that yields no quiz keeps
 * its cards due and asks nothing. So with a card due and nothing drawn yet,
 * the day is drawn here, once, as the window would draw it, and every later
 * visit reads the stored session back. Nothing is drawn for a learner who
 * switched spaced repetition off.
 */
export async function dailyRecallState(
  userId: string,
  now: Date = new Date(),
): Promise<DailyRecallState> {
  const day = dayKey(now);
  const session = await reviewCardRepository.findSession(userId, day);
  if (session !== null) return stateOf(session);
  if (!(await reviewCardRepository.hasDue(userId, now))) return "empty";
  if (!(await revisionsEnabled(userId))) return "empty";
  const drawn = await drawToday(userId, day, now);
  return drawn === null ? "empty" : stateOf(drawn);
}

/**
 * Among these learners, those whose day's recall has a question to ask on
 * the day of `now`, by the rule the draw follows (drawToday): a card due,
 * among the DRAW_WINDOW the draw looks at, whose question its lesson still
 * has. Read without drawing or writing anything, each lesson read once for
 * all of them: the daily reminder goes by it, so a card whose lesson yields
 * no quiz now, due but never asked, brings no reminder.
 */
export async function learnersWithRecall(
  userIds: readonly string[],
  now: Date = new Date(),
): Promise<string[]> {
  if (userIds.length === 0) return [];
  const due = await reviewCardRepository.findDueQuestions(userIds, now);
  if (due.length === 0) return [];
  const sources = sourcesOf(await reviewCardRepository.findLessons(due.map((c) => c.lessonId)));
  const looked = new Map<string, number>();
  const asking = new Set<string>();
  for (const card of due) {
    const seen = looked.get(card.userId) ?? 0;
    if (seen >= DRAW_WINDOW) continue;
    looked.set(card.userId, seen + 1);
    if (sources.has(sourceKey(card.lessonId, card.quizId))) asking.add(card.userId);
  }
  return userIds.filter((id) => asking.has(id));
}

// ── A module's review ─────────────────────────────────────────────────────────

/** A module of a path as this reader may open it: its title and its lessons, in path order. */
async function moduleOf(
  userId: string,
  slug: string,
  number: number,
): Promise<{ path: string; title: string; lessonIds: string[] } | null> {
  const path = await pathRepository.findSheetOutline(slug, userId);
  if (path === null) return null;
  const group = groupIntoModules(path.lessons, path.modules).find((g) => g.number === number);
  if (group === undefined) return null;
  return {
    path: path.slug,
    title: group.title === null ? moduleLabel(group) : `${moduleLabel(group)} · ${group.title}`,
    lessonIds: group.indices
      .map((index) => path.lessons[index]?.lessonId)
      .filter((id): id is string => id !== undefined),
  };
}

/**
 * "Réviser ce module": six questions at most from the module's lessons the
 * learner finished, the same all day. Nothing is stored and nothing is
 * earned.
 */
export async function openModuleReview(
  userId: string,
  input: unknown,
  now: Date = new Date(),
): Promise<RecallView> {
  const day = dayKey(now);
  const parsed = moduleSchema.safeParse(input);
  const missing: RecallView = {
    mode: "module",
    status: "missing",
    day,
    title: "Réviser ce module",
    module: null,
    questions: [],
    verdicts: [],
    result: null,
  };
  if (!parsed.success) return missing;
  const found = await moduleOf(userId, parsed.data.path, parsed.data.module);
  if (found === null) return missing;

  const lessons = await reviewCardRepository.findCompletedLessons(userId, found.lessonIds);
  const order = new Map(found.lessonIds.map((id, i) => [id, i]));
  const inPathOrder = [...lessons].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  const sources = sourcesOf(inPathOrder);
  const draw = drawModuleReview(
    [...sources.values()],
    userId,
    `${found.path}:${String(parsed.data.module)}`,
    day,
  );
  const questions = questionsOf(draw, sources);
  return {
    ...missing,
    status: questions.length === 0 ? "empty" : "open",
    title: found.title,
    module: { path: found.path, number: parsed.data.module },
    questions,
  };
}

/**
 * One answer to a module's review, checked against the question's option
 * order for the day the review was drawn. Nothing is written.
 */
export async function answerModuleReview(
  userId: string,
  input: unknown,
): Promise<RecallAnswerResult> {
  const parsed = moduleAnswerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID };
  const { path, day, index, lessonId, quizId } = parsed.data;
  const pick = parsed.data.selected;

  const found = await moduleOf(userId, path, parsed.data.module);
  if (found === null) return { ok: false, error: NO_MODULE };
  if (!found.lessonIds.includes(lessonId)) return { ok: false, error: GONE };
  const lessons = await reviewCardRepository.findCompletedLessons(userId, [lessonId]);
  const sources = sourcesOf(lessons);
  const source = sources.get(sourceKey(lessonId, quizId));
  if (source === undefined) return { ok: false, error: GONE };
  if (pick >= source.options.length) return { ok: false, error: INVALID };

  const ref: MockRef = {
    lessonId,
    quizId,
    domain: source.domain,
    order: reviewOptionOrder(source.options, userId, lessonId, quizId, day),
  };
  const verdict = verdictOf(index, ref, pick, sources, new Passages(lessons));
  if (verdict === null) return { ok: false, error: GONE };
  return { ok: true, verdict, result: null };
}
