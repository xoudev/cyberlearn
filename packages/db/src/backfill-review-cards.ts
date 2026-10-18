// One-off conversion of the lesson-level review queue (SM-2) into review
// cards (review_cards, Leitner), run by hand with `db:backfill-review-cards`.
// The queue is retired: nothing writes its rows any more, and they wait in
// review_schedules_legacy, read by this script (and listed in the GDPR
// export), until a later release drops the table once the conversion has run
// in production (docs/DEPLOY.md).
//
// An SM-2 row says a learner finished a lesson and reviews it. It becomes the
// cards a completion enqueues today (apps/web/lib/lessons/complete.ts), with
// what the old row knew:
//
// - A lesson the learner no longer has completed gives nothing: its progress
//   was reset since, the whole account's or the lesson's from the console,
//   and neither touches the old rows any more.
// - A lesson whose completion enqueues nothing gives nothing here either: a
//   module review, a project or a class lesson (isReviewableLesson), or no
//   quiz to ask in its current MDX (extractLessonQuizzes: a lesson that does
//   not parse has none).
// - A lesson that is a draft or archived when the script runs is converted
//   all the same: an admin can publish it again, and the old queue only hid
//   its rows meanwhile (LIVE_REVIEW_FILTER). Every read of the cards filters
//   on the same, so its cards stay hidden until it is published again, and
//   its learners' history is not lost with the old queue.
// - With the learner's answers on record (lesson_quiz_answers, kept since
//   24 September 2026), the cards are cardsForCompletion's: every question
//   missed, and the last one answered right. An answer to a quiz the lesson
//   no longer has counts for nothing.
// - With none (finished before answers were kept, or in an app that did not
//   send them), one card: the lesson's last question, as cardsForCompletion
//   keeps the last one answered right, in the box the row's interval had
//   reached (boxForSchedule), so months of reviews do not start over. It was
//   never answered, so it is not marked answered right (everCorrect) and
//   does not retire on its own (isStale).
// - Due dates: the lessons due already (today or before) spread over
//   CONVERSION_SPREAD_DAYS days from today, the most overdue first, so nobody
//   gets their whole backlog in one session; the others keep the day the row
//   had them due.
// - A lesson the learner already has a card for, retired or not, is left
//   alone: its cards came from a completion since the cards shipped, or from
//   an earlier run. A second run straight after writes nothing, and so does
//   a later one: no row has been added since the queue was retired. The
//   writes go through reviewCardRepository.enqueueForLesson, which skips a
//   card already there anyway.
//
// The revision switch (spacedRepetition) is not read: a completion leaves the
// rows of a learner who turned it off alone, so that turning it back on picks
// up where it stopped, and the cards are hidden while it is off as the rows
// were (apps/web/lib/revisions/daily-recall.ts). The SM-2 rows are not
// touched: they go with the legacy table.

import { dayKey } from "@cyberlearn/lib/gamification/day";
import { extractLessonQuizzes } from "@cyberlearn/lib/mdx-quizzes";
import {
  CARD_BOX_DAYS,
  CARD_FIRST_BOX,
  cardsForCompletion,
  dayStart,
  dueAfter,
  dueCutoff,
  isReviewableLesson,
  type CompletionAnswer,
  type NewCard,
} from "@cyberlearn/lib/revisions/cards";
import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "./prisma.js";
import { reviewCardRepository } from "./repositories/review-card.repository.js";

/** The lessons due already are spread over this many days: today to four days later. */
export const CONVERSION_SPREAD_DAYS = 5;

/** Learners read and written per round trip. */
const DEFAULT_BATCH_SIZE = 200;

/** What became of one SM-2 row. */
export type ConversionOutcome =
  /** Cards from the answers on record (cardsForCompletion). */
  | "fromAnswers"
  /** No answer on record: one card, in the box the row's interval reached. */
  | "fromSchedule"
  /** The learner has a card for the lesson already: left alone. */
  | "alreadyConverted"
  /** The learner no longer has the lesson completed: its progress was reset since. */
  | "notCompleted"
  /** The lesson was not read: its first row came while the run went on. */
  | "lessonNotFound"
  /** A module review, a project or a class lesson. */
  | "notReviewable"
  /** The lesson has no quiz to ask, or its MDX does not parse. */
  | "noQuiz";

export const CONVERSION_OUTCOMES: readonly ConversionOutcome[] = [
  "fromAnswers",
  "fromSchedule",
  "alreadyConverted",
  "notCompleted",
  "lessonNotFound",
  "notReviewable",
  "noQuiz",
];

/** One learner's SM-2 row, as the conversion reads it. */
export interface ScheduleRow {
  lessonId: string;
  nextReviewAt: Date;
  intervalDays: number;
  repetitions: number;
  /**
   * Whether the learner still has the lesson completed. A reset since (the
   * whole account's, or the lesson's from the console) leaves the row behind.
   */
  lessonCompleted: boolean;
}

/** A lesson as the conversion needs it, read once for every learner. */
export interface ConversionLesson {
  id: string;
  slug: string;
  /** A draft or archived lesson is converted too; its cards stay hidden until it is published. */
  published: boolean;
  /** isReviewableLesson: not a module review, a project or a class lesson. */
  reviewable: boolean;
  /** Its quizzes as it has them now, in order; empty when not reviewable. */
  quizIds: readonly string[];
}

/** A lesson row as stored. */
export interface ConversionLessonRow {
  id: string;
  slug: string;
  title: string;
  audience: string;
  status: string;
  contentMdx: string;
}

/** What the conversion makes of one SM-2 row. */
export interface PlannedLesson {
  lessonId: string;
  outcome: ConversionOutcome;
  cards: NewCard[];
}

/** Reads a lesson once: whether it gives cards, and its quiz ids now. */
export function conversionLesson(row: ConversionLessonRow): ConversionLesson {
  const published = row.status === "PUBLISHED";
  const reviewable = isReviewableLesson(row);
  return {
    id: row.id,
    slug: row.slug,
    published,
    reviewable,
    quizIds: reviewable ? extractLessonQuizzes(row.contentMdx).map((quiz) => quiz.id) : [],
  };
}

/**
 * The box an SM-2 row's progress maps to: the last box whose wait the row's
 * interval reached (1, 3, 7, then 21 days). SM-2 waits 1 day, 1 again, 6,
 * then grows the interval by the ease factor: a lesson never yet recalled
 * (no repetition) starts in the first box, one recalled for a month or more
 * in the last, where one right answer retires its card.
 */
export function boxForSchedule(
  schedule: Pick<ScheduleRow, "intervalDays" | "repetitions">,
): number {
  if (schedule.repetitions <= 0) return CARD_FIRST_BOX;
  let box = CARD_FIRST_BOX;
  CARD_BOX_DAYS.forEach((days, index) => {
    if (schedule.intervalDays >= days) box = index + 1;
  });
  return box;
}

/**
 * The day each lesson's cards are due, by lesson id. The lessons due already
 * (on the day of `now` or before) spread over CONVERSION_SPREAD_DAYS days
 * from today, the most overdue first, one lesson a day in turn; the others
 * keep the day the row had them due. The same rows give the same days, in
 * whatever order they come.
 */
export function conversionDueDates(
  schedules: readonly Pick<ScheduleRow, "lessonId" | "nextReviewAt">[],
  now: Date,
): Map<string, Date> {
  const today = dueCutoff(now);
  const due = new Map<string, Date>();
  const overdue: Pick<ScheduleRow, "lessonId" | "nextReviewAt">[] = [];
  for (const schedule of schedules) {
    const wasDue = dayStart(dayKey(schedule.nextReviewAt));
    if (wasDue.getTime() > today.getTime()) due.set(schedule.lessonId, wasDue);
    else overdue.push(schedule);
  }
  overdue
    .sort(
      (a, b) =>
        a.nextReviewAt.getTime() - b.nextReviewAt.getTime() ||
        (a.lessonId < b.lessonId ? -1 : a.lessonId > b.lessonId ? 1 : 0),
    )
    .forEach((schedule, rank) => {
      due.set(schedule.lessonId, dueAfter(now, rank % CONVERSION_SPREAD_DAYS));
    });
  return due;
}

/** Whether a row gives cards, and from what. */
function outcomeOf(
  schedule: ScheduleRow,
  lesson: ConversionLesson | undefined,
  answers: readonly CompletionAnswer[],
  converted: boolean,
): ConversionOutcome {
  if (converted) return "alreadyConverted";
  if (!schedule.lessonCompleted) return "notCompleted";
  if (lesson === undefined) return "lessonNotFound";
  if (!lesson.reviewable) return "notReviewable";
  if (lesson.quizIds.length === 0) return "noQuiz";
  const ids = new Set(lesson.quizIds);
  return answers.some((answer) => ids.has(answer.quizId)) ? "fromAnswers" : "fromSchedule";
}

/**
 * What the conversion makes of one learner's SM-2 rows: each row's outcome,
 * and the cards to enqueue for it, every card of a lesson due the same day
 * (conversionDueDates).
 *
 * `answers` holds the learner's recorded answers by lesson id; `converted`
 * the lessons they have a card for already, retired or not.
 */
export function planUserConversion(
  schedules: readonly ScheduleRow[],
  lessons: ReadonlyMap<string, ConversionLesson>,
  answers: ReadonlyMap<string, readonly CompletionAnswer[]>,
  converted: ReadonlySet<string>,
  now: Date,
): PlannedLesson[] {
  const classified = schedules.map((schedule) => {
    const lesson = lessons.get(schedule.lessonId);
    const lessonAnswers = answers.get(schedule.lessonId) ?? [];
    return {
      schedule,
      lesson,
      answers: lessonAnswers,
      outcome: outcomeOf(schedule, lesson, lessonAnswers, converted.has(schedule.lessonId)),
    };
  });
  const dueDates = conversionDueDates(
    classified
      .filter((row) => row.outcome === "fromAnswers" || row.outcome === "fromSchedule")
      .map((row) => row.schedule),
    now,
  );
  return classified.map(({ schedule, lesson, answers: lessonAnswers, outcome }): PlannedLesson => {
    const dueAt = dueDates.get(schedule.lessonId);
    if (lesson === undefined || dueAt === undefined) {
      return { lessonId: schedule.lessonId, outcome, cards: [] };
    }
    if (outcome === "fromAnswers") {
      const cards = cardsForCompletion(lesson.quizIds, lessonAnswers, now).map((card) => ({
        ...card,
        dueAt,
      }));
      return { lessonId: schedule.lessonId, outcome, cards };
    }
    const lastQuiz = lesson.quizIds.at(-1);
    const cards: NewCard[] =
      lastQuiz === undefined
        ? []
        : [{ quizId: lastQuiz, box: boxForSchedule(schedule), dueAt, everCorrect: false }];
    return { lessonId: schedule.lessonId, outcome, cards };
  });
}

/** How the command line asked for the run. */
export type BackfillArgs =
  | { ok: true; apply: boolean; verbose: boolean }
  | { ok: false; error: string };

/**
 * Reads the command line: a dry run unless `--apply` is given, `--dry-run`
 * saying so outright. Anything else is refused rather than ignored, so a
 * mistyped `--apply` cannot pass for a dry run, nor the reverse. A bare `--`,
 * which a package manager may pass along, means nothing.
 */
export function parseBackfillArgs(argv: readonly string[]): BackfillArgs {
  let apply = false;
  let dryRun = false;
  let verbose = false;
  for (const arg of argv) {
    if (arg === "--") continue;
    if (arg === "--apply") apply = true;
    else if (arg === "--dry-run") dryRun = true;
    else if (arg === "--verbose") verbose = true;
    else return { ok: false, error: `Unknown argument: ${arg}` };
  }
  if (apply && dryRun) return { ok: false, error: "Pass --apply or --dry-run, not both." };
  return { ok: true, apply, verbose };
}

export interface BackfillReviewCardsOptions {
  apply: boolean;
  /** The moment the due dates count from; now by default. */
  now?: Date;
  batchSize?: number;
  client?: PrismaClient;
}

export interface BackfillReviewCardsReport {
  applied: boolean;
  /** Learners with an SM-2 row. */
  users: number;
  /** SM-2 rows read. */
  schedules: number;
  /** SM-2 rows by what became of them. */
  outcomes: Record<ConversionOutcome, number>;
  /** Rows given cards for a lesson that is a draft or archived now: hidden until it is published. */
  unpublishedLessons: number;
  cardsPlanned: number;
  /** Cards written: 0 on a dry run. */
  cardsCreated: number;
  /** Cards planned by the day they are due (day key). */
  dueDays: Record<string, number>;
  /** The last day (day key) the lessons due already are spread over. */
  lastSpreadDay: string;
  /** The learners given cards. */
  perUser: { userId: string; lessons: number; cards: number }[];
  /** The lessons cards were planned for. */
  perLesson: { lessonId: string; slug: string; learners: number; cards: number }[];
}

function emptyOutcomes(): Record<ConversionOutcome, number> {
  return {
    fromAnswers: 0,
    fromSchedule: 0,
    alreadyConverted: 0,
    notCompleted: 0,
    lessonNotFound: 0,
    notReviewable: 0,
    noQuiz: 0,
  };
}

/** Rows keyed by user id. */
function byUser<T extends { userId: string }>(rows: readonly T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.userId);
    if (bucket === undefined) grouped.set(row.userId, [row]);
    else bucket.push(row);
  }
  return grouped;
}

/**
 * Converts every learner's SM-2 rows into review cards, a batch of learners
 * at a time. On a dry run nothing is written and the report says what would
 * be. Idempotent: see the head of this file.
 */
export async function backfillReviewCards(
  options: BackfillReviewCardsOptions,
): Promise<BackfillReviewCardsReport> {
  const client = options.client ?? defaultPrisma;
  const now = options.now ?? new Date();
  const batchSize = Math.max(1, options.batchSize ?? DEFAULT_BATCH_SIZE);

  // Every lesson with an SM-2 row, its MDX read once for all its learners.
  const lessonRows = await client.lesson.findMany({
    where: { reviewSchedulesLegacy: { some: {} } },
    select: { id: true, slug: true, title: true, audience: true, status: true, contentMdx: true },
  });
  const lessons = new Map(lessonRows.map((row) => [row.id, conversionLesson(row)]));

  const userIds = (
    await client.reviewScheduleLegacy.findMany({
      distinct: ["userId"],
      orderBy: { userId: "asc" },
      select: { userId: true },
    })
  ).map((row) => row.userId);

  const report: BackfillReviewCardsReport = {
    applied: options.apply,
    users: userIds.length,
    schedules: 0,
    outcomes: emptyOutcomes(),
    unpublishedLessons: 0,
    cardsPlanned: 0,
    cardsCreated: 0,
    dueDays: {},
    lastSpreadDay: dueAfter(now, CONVERSION_SPREAD_DAYS - 1)
      .toISOString()
      .slice(0, 10),
    perUser: [],
    perLesson: [],
  };
  const perLesson = new Map<string, { learners: number; cards: number }>();

  for (let start = 0; start < userIds.length; start += batchSize) {
    const batch = userIds.slice(start, start + batchSize);
    const [schedules, existing, answers, completions] = await Promise.all([
      client.reviewScheduleLegacy.findMany({
        where: { userId: { in: batch } },
        select: {
          userId: true,
          lessonId: true,
          nextReviewAt: true,
          intervalDays: true,
          repetitions: true,
        },
      }),
      client.reviewCard.findMany({
        where: { userId: { in: batch } },
        distinct: ["userId", "lessonId"],
        select: { userId: true, lessonId: true },
      }),
      client.lessonQuizAnswer.findMany({
        where: { userId: { in: batch } },
        select: { userId: true, lessonId: true, quizId: true, correct: true },
      }),
      client.userLessonProgress.findMany({
        where: { userId: { in: batch }, status: "COMPLETED" },
        select: { userId: true, lessonId: true },
      }),
    ]);
    const schedulesByUser = byUser(schedules);
    const existingByUser = byUser(existing);
    const answersByUser = byUser(answers);
    const completionsByUser = byUser(completions);

    for (const userId of batch) {
      const completed = new Set((completionsByUser.get(userId) ?? []).map((row) => row.lessonId));
      const userSchedules = (schedulesByUser.get(userId) ?? []).map(
        (row): ScheduleRow => ({
          lessonId: row.lessonId,
          nextReviewAt: row.nextReviewAt,
          intervalDays: row.intervalDays,
          repetitions: row.repetitions,
          lessonCompleted: completed.has(row.lessonId),
        }),
      );
      const converted = new Set((existingByUser.get(userId) ?? []).map((row) => row.lessonId));
      const userAnswers = new Map<string, CompletionAnswer[]>();
      for (const answer of answersByUser.get(userId) ?? []) {
        const bucket = userAnswers.get(answer.lessonId);
        const entry = { quizId: answer.quizId, correct: answer.correct };
        if (bucket === undefined) userAnswers.set(answer.lessonId, [entry]);
        else bucket.push(entry);
      }

      const plan = planUserConversion(userSchedules, lessons, userAnswers, converted, now);
      report.schedules += plan.length;
      let userLessons = 0;
      let userCards = 0;
      for (const planned of plan) {
        report.outcomes[planned.outcome] += 1;
        if (planned.cards.length === 0) continue;
        if (lessons.get(planned.lessonId)?.published === false) report.unpublishedLessons += 1;
        userLessons += 1;
        userCards += planned.cards.length;
        const lessonTally = perLesson.get(planned.lessonId) ?? { learners: 0, cards: 0 };
        lessonTally.learners += 1;
        lessonTally.cards += planned.cards.length;
        perLesson.set(planned.lessonId, lessonTally);
        for (const card of planned.cards) {
          const day = card.dueAt.toISOString().slice(0, 10);
          report.dueDays[day] = (report.dueDays[day] ?? 0) + 1;
        }
        if (options.apply) {
          report.cardsCreated += await reviewCardRepository.enqueueForLesson(
            userId,
            planned.lessonId,
            planned.cards,
            client,
          );
        }
      }
      report.cardsPlanned += userCards;
      if (userCards > 0) report.perUser.push({ userId, lessons: userLessons, cards: userCards });
    }
  }

  report.perLesson = [...perLesson.entries()]
    .map(([lessonId, tally]) => ({
      lessonId,
      slug: lessons.get(lessonId)?.slug ?? lessonId,
      ...tally,
    }))
    .sort((a, b) => b.cards - a.cards || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  return report;
}
