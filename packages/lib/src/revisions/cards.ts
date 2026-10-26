import {
  clientQuestions,
  sourceKey,
  type MockQuestion,
  type MockRef,
  type MockSource,
} from "../exam/mock.js";
import { dayKey } from "../gamification/day.js";
import { quizOptionOrder, quizOrderSeed, seededRandom } from "../quiz/option-order.js";
import { checkDuelAnswer } from "../social/duel.js";

/**
 * Review cards: one lesson quiz question asked again, in Leitner boxes, a few
 * a day.
 *
 * The lesson-level queue they replaced (SM-2, retired) asked a learner to say
 * how well they remembered a whole lesson, on their own word, and every lesson
 * finished came back five times or more. A card is one question, answered and
 * checked on the server, and only the questions that need it come back:
 *
 * - Completing a lesson enqueues every question answered wrong there, due the
 *   next day, and the last one answered right, due a week later
 *   (cardsForCompletion). Module reviews, projects and class lessons enqueue
 *   nothing (isReviewableLesson).
 * - A right answer moves a card up a box, due again 1, 3, 7, then 21 days
 *   later; past the last box it retires. A wrong answer sends it back to the
 *   first box (answerCard).
 * - A card answered right at least once and long overdue retires on its own
 *   (isStale), and so does a card whose question is gone from its lesson
 *   (orphanCards).
 * - A day's session is six cards at most, the most overdue first, two at most
 *   from the same lesson (pickSessionCards), each with its options in an
 *   order of that day (drawReviewSession). Handed in, it earns
 *   REVIEW_SESSION_XP once.
 * - "Réviser ce module" asks six questions at most from the module's lessons
 *   the learner finished, on demand, without cards, XP or anything stored
 *   (drawModuleReview).
 *
 * Days are the platform's calendar days (gamification/day.ts). A due date is
 * stored as the start of its day, as an activity day is (dayStart): a card due
 * tomorrow is in tomorrow's session, whatever the hour the session is drawn.
 *
 * Pure: the site reads and writes cards through reviewCardRepository
 * (@cyberlearn/db) with these rules, and the answer key never leaves the
 * server. A draw refers to a question by lesson and quiz id with its option
 * order, as a mock exam or a duel does (exam/mock.ts, social/duel.ts).
 */

/** Days until a card is due again, by box: box 1 the next day, box 4 three weeks later. */
export const CARD_BOX_DAYS = [1, 3, 7, 21] as const;

export const CARD_FIRST_BOX = 1;

/** Past this box, a right answer retires the card. */
export const CARD_LAST_BOX: number = CARD_BOX_DAYS.length;

/**
 * The box a question answered right in its lesson starts in: due a week
 * later, then three weeks, then retired.
 */
export const CARD_KEPT_RIGHT_BOX = 3;

/** Overdue by more than this, a card answered right at least once retires rather than wait. */
export const CARD_STALE_DAYS = 30;

/** Cards in a day's session, at most. */
export const CARD_SESSION_SIZE = 6;

/** Cards from the same lesson in a session, at most. */
export const CARD_SESSION_PER_LESSON = 2;

/**
 * XP for a day's session, once it is handed in, whatever the score: what is
 * paid is coming back each day, and a question missed is the one that needed
 * asking. Credited once a day (claimSessionXp in the repository).
 */
export const REVIEW_SESSION_XP = 15;

/** The column is a smallint. */
const MAX_LAPSES = 32_767;

const DAY_MS = 86_400_000;

/** A day key's start, as a due date and a session's day are stored: midnight UTC on that date. */
export function dayStart(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

/** The due date `days` calendar days after the day of `now`. */
export function dueAfter(now: Date, days: number): Date {
  return new Date(dayStart(dayKey(now)).getTime() + days * DAY_MS);
}

/** On the day of `now`, every card due on or before this is due. */
export function dueCutoff(now: Date): Date {
  return dayStart(dayKey(now));
}

/** On `day` (a day key), a card due before this is more than CARD_STALE_DAYS overdue. */
function staleCutoff(day: string): Date {
  return new Date(dayStart(day).getTime() - CARD_STALE_DAYS * DAY_MS);
}

/** On the day of `now`, a card due before this is more than CARD_STALE_DAYS overdue. */
export function staleBefore(now: Date): Date {
  return staleCutoff(dayKey(now));
}

function clampBox(box: number): number {
  return Math.min(CARD_LAST_BOX, Math.max(CARD_FIRST_BOX, Math.trunc(box)));
}

/** Days until a card in `box` is due again. */
export function daysForBox(box: number): number {
  return CARD_BOX_DAYS[clampBox(box) - 1] ?? CARD_BOX_DAYS[0];
}

/** Where a card stands: the columns its schedule is written in. */
export interface CardSchedule {
  box: number;
  dueAt: Date;
  lapses: number;
  /** Whether the question was ever answered right: in its lesson, or as a card. */
  everCorrect: boolean;
  lastAnsweredAt: Date | null;
  retiredAt: Date | null;
}

/**
 * Where a card goes once answered: up a box when right, retired when right
 * in the last box, back to the first box when wrong, with one more lapse. A
 * right answer marks it answered right once, for good.
 */
export function answerCard(
  card: Pick<CardSchedule, "box" | "dueAt" | "lapses" | "everCorrect">,
  correct: boolean,
  now: Date,
): CardSchedule {
  const box = clampBox(card.box);
  if (!correct) {
    return {
      box: CARD_FIRST_BOX,
      dueAt: dueAfter(now, daysForBox(CARD_FIRST_BOX)),
      lapses: Math.min(card.lapses + 1, MAX_LAPSES),
      everCorrect: card.everCorrect,
      lastAnsweredAt: now,
      retiredAt: null,
    };
  }
  if (box >= CARD_LAST_BOX) {
    return {
      box,
      dueAt: card.dueAt,
      lapses: card.lapses,
      everCorrect: true,
      lastAnsweredAt: now,
      retiredAt: now,
    };
  }
  const next = box + 1;
  return {
    box: next,
    dueAt: dueAfter(now, daysForBox(next)),
    lapses: card.lapses,
    everCorrect: true,
    lastAnsweredAt: now,
    retiredAt: null,
  };
}

/** Answered right at least once and due before `cutoff` (staleCutoff): the thirty-day rule. */
function isPastStale(card: Pick<CardSchedule, "everCorrect" | "dueAt">, cutoff: Date): boolean {
  return card.everCorrect && card.dueAt.getTime() < cutoff.getTime();
}

/**
 * Whether a card retires on its own: answered right at least once, and more
 * than CARD_STALE_DAYS overdue. Somebody away for a month comes back to the
 * questions they never got right, not to a backlog of those they did once.
 * A question never answered right waits however long it takes.
 *
 * A session never draws such a card (drawReviewSession, and findDue in the
 * repository), whether retireStale has written its retirement yet or not.
 */
export function isStale(
  card: Pick<CardSchedule, "everCorrect" | "dueAt" | "retiredAt">,
  now: Date,
): boolean {
  return card.retiredAt === null && isPastStale(card, staleBefore(now));
}

/**
 * The cards whose question is gone from their lesson, to retire. `quizIds`
 * holds, by lesson id, the quiz ids each lesson has now.
 *
 * A card whose lesson is not in it is not judged, and neither is one whose
 * lesson has no quiz in it: a lesson whose MDX fails to parse reads as having
 * none (extractLessonQuizzes), and one bad edit must not retire every
 * learner's cards for that lesson for good (enqueueing again leaves a retired
 * card retired). A card whose question is really gone is never drawn anyway
 * (drawReviewSession).
 */
export function orphanCards<T extends { lessonId: string; quizId: string }>(
  cards: readonly T[],
  quizIds: ReadonlyMap<string, ReadonlySet<string>>,
): T[] {
  return cards.filter((card) => {
    const ids = quizIds.get(card.lessonId);
    return ids !== undefined && ids.size > 0 && !ids.has(card.quizId);
  });
}

/** What a lesson says about whether its questions come back. */
export interface ReviewableLesson {
  slug: string;
  title: string;
  audience: string;
}

/** "Bilan du module 3 : …", "Projet : …", "Projet final : …". */
const UNREVIEWED_TITLE = /^\s*(bilan|projet)\b/iu;

/** "linux-bilan-module-3", "asm-projet", "linux-projet-durcir". */
const UNREVIEWED_SLUG = /(^|-)(bilan|projet)(-|$)/u;

/**
 * Whether completing this lesson enqueues cards.
 *
 * Not a module review: its quiz goes over the module's lessons, whose own
 * questions enqueued their cards. Not a project: its questions are about a
 * piece of work, not facts to recall. Nothing in the data model marks
 * either, so the rule reads what the catalogue names them, every one of
 * them: a module review is titled "Bilan du module N : …" (slug
 * `<path>-bilan-module-N`), a project "Projet : …" or "Projet final : …"
 * (slug `<path>-projet…`, except the five steps of the fundamentals path's
 * final project, hence the title as well).
 *
 * Not a lesson a teacher wrote for their classes (audience CLASS): the
 * teacher may rewrite or withdraw it at any time, and the cards would
 * outlive the class.
 */
export function isReviewableLesson(lesson: ReviewableLesson): boolean {
  if (lesson.audience === "CLASS") return false;
  return !UNREVIEWED_TITLE.test(lesson.title) && !UNREVIEWED_SLUG.test(lesson.slug);
}

/** A lesson quiz's first answer, as recorded (lesson_quiz_answers). */
export interface CompletionAnswer {
  quizId: string;
  correct: boolean;
}

/** A card to enqueue. */
export interface NewCard {
  quizId: string;
  box: number;
  dueAt: Date;
  /** True for the question answered right in the lesson. */
  everCorrect: boolean;
}

/**
 * The cards a completed lesson enqueues: every question answered wrong, in
 * the first box, due the next day; and the last question of the lesson
 * answered right, in CARD_KEPT_RIGHT_BOX, due a week later, so a lesson
 * passed without a miss still comes back once. The last because it comes
 * after the whole lesson, and because the same answers always give the same
 * card.
 *
 * `quizIds` are the lesson's quizzes as it has them now, in order: an answer
 * to a quiz since removed counts for nothing, and a quiz never answered (an
 * app from before answers were recorded) neither.
 */
export function cardsForCompletion(
  quizIds: readonly string[],
  answers: readonly CompletionAnswer[],
  now: Date,
): NewCard[] {
  const verdict = new Map(answers.map((answer) => [answer.quizId, answer.correct]));
  const cards: NewCard[] = quizIds
    .filter((id) => verdict.get(id) === false)
    .map((quizId) => ({
      quizId,
      box: CARD_FIRST_BOX,
      dueAt: dueAfter(now, daysForBox(CARD_FIRST_BOX)),
      everCorrect: false,
    }));
  const lastRight = quizIds.filter((id) => verdict.get(id) === true).at(-1);
  if (lastRight !== undefined) {
    cards.push({
      quizId: lastRight,
      box: CARD_KEPT_RIGHT_BOX,
      dueAt: dueAfter(now, daysForBox(CARD_KEPT_RIGHT_BOX)),
      everCorrect: true,
    });
  }
  return cards;
}

/** A card due, as a session is drawn from. */
export interface DueCard {
  id: string;
  lessonId: string;
  quizId: string;
  box: number;
  dueAt: Date;
  everCorrect: boolean;
}

/** Most overdue first, the lowest box next: the shakiest of those waiting longest. */
export function prioritizeCards<T extends Pick<DueCard, "box" | "dueAt">>(
  cards: readonly T[],
): T[] {
  return [...cards].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime() || a.box - b.box);
}

/**
 * The cards of a day's session, in the order they are asked: CARD_SESSION_SIZE
 * at most, by priority, CARD_SESSION_PER_LESSON at most from one lesson so a
 * lesson missed badly does not take the whole session.
 */
export function pickSessionCards<T extends DueCard>(
  due: readonly T[],
  size: number = CARD_SESSION_SIZE,
  perLesson: number = CARD_SESSION_PER_LESSON,
): T[] {
  const picked: T[] = [];
  const fromLesson = new Map<string, number>();
  for (const card of prioritizeCards(due)) {
    if (picked.length >= size) break;
    const taken = fromLesson.get(card.lessonId) ?? 0;
    if (taken >= perLesson) continue;
    fromLesson.set(card.lessonId, taken + 1);
    picked.push(card);
  }
  return picked;
}

/** One drawn card as a session stores it: which card, its question, the option order shown. */
export interface ReviewDrawRef extends MockRef {
  cardId: string;
}

/**
 * The order a review question's options are shown in on `day`: the lesson's
 * own shuffle for this learner (quiz/option-order.ts), seeded with the day as
 * well. A new order each day the question comes back, so the place of the
 * right answer cannot be remembered instead of the answer; the same order all
 * day, in the day's session and in a module's review alike; an option that
 * refers to the others ("Aucune des trois") keeps its place.
 */
export function reviewOptionOrder(
  options: readonly string[],
  userId: string,
  lessonId: string,
  quizId: string,
  day: string,
): number[] {
  return quizOptionOrder(options, `${quizOrderSeed(userId, lessonId, quizId)}:${day}`);
}

/**
 * The questions of a draw as the learner is shown them: options in the drawn
 * order, no answer key, `index` the drawn index an answer is sent with. A
 * question gone from its lesson, or whose options changed since the draw, is
 * left out.
 */
export function reviewQuestions(
  draw: readonly MockRef[],
  sources: ReadonlyMap<string, MockSource>,
): MockQuestion[] {
  return clientQuestions(draw, sources);
}

/**
 * Whether every question of a session that can still be asked has its answer,
 * at least one being asked: the session is then done. A question gone from
 * its lesson since the draw is not waited for, or the session could never be
 * handed in.
 */
export function isSessionAnswered(
  draw: readonly MockRef[],
  sources: ReadonlyMap<string, MockSource>,
  answers: Readonly<Record<string, number>>,
): boolean {
  const askable = reviewQuestions(draw, sources);
  return askable.length > 0 && askable.every((q) => answers[String(q.index)] !== undefined);
}

/**
 * "Réviser ce module": CARD_SESSION_SIZE questions at most out of `sources`,
 * the quizzes of the module's lessons the learner finished, in a shuffled
 * order, CARD_SESSION_PER_LESSON at most from one lesson, each with its
 * options in the day's order (reviewOptionOrder).
 *
 * Nothing is stored and nothing is earned: the same learner, module (`scope`)
 * and day draw the same questions, and a question's option order depends on
 * the question and the day alone, so an answer is checked by working that
 * order out again, whatever was drawn around it.
 */
export function drawModuleReview(
  sources: readonly MockSource[],
  userId: string,
  scope: string,
  day: string,
  size: number = CARD_SESSION_SIZE,
  perLesson: number = CARD_SESSION_PER_LESSON,
): MockRef[] {
  const random = seededRandom(`${userId}:${scope}:${day}`);
  const shuffled = [...sources];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = shuffled[i];
    const b = shuffled[j];
    if (a === undefined || b === undefined) continue;
    shuffled[i] = b;
    shuffled[j] = a;
  }
  const picked: MockSource[] = [];
  const fromLesson = new Map<string, number>();
  for (const source of shuffled) {
    if (picked.length >= size) break;
    const taken = fromLesson.get(source.lessonId) ?? 0;
    if (taken >= perLesson) continue;
    fromLesson.set(source.lessonId, taken + 1);
    picked.push(source);
  }
  return picked.map((source) => ({
    lessonId: source.lessonId,
    quizId: source.quizId,
    domain: source.domain,
    order: reviewOptionOrder(source.options, userId, source.lessonId, source.quizId, day),
  }));
}

/**
 * A day's session out of the cards due, among those whose question the
 * lesson still has (`sources`, keyed by sourceKey, the domain being the
 * lesson's title) and that are not stale that day (isStale): a card the
 * thirty-day rule retires is never asked, whether its retirement was written
 * yet or not.
 *
 * Each card's options come in the day's order (reviewOptionOrder): a new
 * order each time the card comes back, and the same day draws the same order
 * twice.
 */
export function drawReviewSession(
  due: readonly DueCard[],
  sources: ReadonlyMap<string, MockSource>,
  userId: string,
  day: string,
): ReviewDrawRef[] {
  const cutoff = staleCutoff(day);
  const askable = due.filter(
    (card) => !isPastStale(card, cutoff) && sources.has(sourceKey(card.lessonId, card.quizId)),
  );
  return pickSessionCards(askable).flatMap((card): ReviewDrawRef[] => {
    const source = sources.get(sourceKey(card.lessonId, card.quizId));
    if (source === undefined) return [];
    return [
      {
        cardId: card.id,
        lessonId: card.lessonId,
        quizId: card.quizId,
        domain: source.domain,
        order: reviewOptionOrder(source.options, userId, card.lessonId, card.quizId, day),
      },
    ];
  });
}

/** What an answer in a session says about its card. */
export interface CardVerdict {
  cardId: string;
  lessonId: string;
  quizId: string;
  correct: boolean;
  /** The shown option that was right. */
  correctIndex: number;
}

/**
 * The verdict on each answered card of a session, answers keyed by drawn
 * index, each the shown option picked, checked as a duel's are
 * (checkDuelAnswer). A card left unanswered, whose question went or changed
 * since the draw, or whose answer is out of range gets none: it is neither
 * moved up nor sent back.
 */
export function gradeReviewSession(
  draw: readonly ReviewDrawRef[],
  sources: ReadonlyMap<string, MockSource>,
  answers: Readonly<Record<string, number>>,
): CardVerdict[] {
  return draw.flatMap((ref, index): CardVerdict[] => {
    const selected = answers[String(index)];
    if (selected === undefined) return [];
    const checked = checkDuelAnswer(ref, sources, selected);
    if (checked === null) return [];
    return [
      {
        cardId: ref.cardId,
        lessonId: ref.lessonId,
        quizId: ref.quizId,
        correct: checked.correct,
        correctIndex: checked.correctIndex,
      },
    ];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A session's draw read back from its JSON column: our own data, checked field by field. */
export function readDraw(value: unknown): ReviewDrawRef[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): ReviewDrawRef[] => {
    if (!isRecord(item)) return [];
    const { cardId, lessonId, quizId, domain, order } = item;
    if (
      typeof cardId !== "string" ||
      typeof lessonId !== "string" ||
      typeof quizId !== "string" ||
      typeof domain !== "string" ||
      !Array.isArray(order) ||
      !order.every((k): k is number => typeof k === "number" && Number.isInteger(k))
    ) {
      return [];
    }
    return [{ cardId, lessonId, quizId, domain, order }];
  });
}

/** A session's answers read back from their JSON column: drawn index to the shown option picked. */
export function readSessionAnswers(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  const answers: Record<string, number> = {};
  for (const [index, selected] of Object.entries(value)) {
    if (/^\d+$/u.test(index) && typeof selected === "number" && Number.isInteger(selected)) {
      answers[index] = selected;
    }
  }
  return answers;
}
