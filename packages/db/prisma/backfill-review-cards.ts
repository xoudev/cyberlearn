/**
 * One-off conversion of the lesson-level review queue (review_schedules,
 * SM-2) into review cards (review_cards, Leitner). Run by hand, in
 * production: once the cards are live, and one last time right before the
 * old queue is removed. See docs/DEPLOY.md for when, and the head of
 * src/backfill-review-cards.ts for the rules.
 *
 * Idempotent: a lesson the learner already has a card for is left alone, so a
 * second run straight after writes nothing; a later one converts only the
 * rows added in between. The SM-2 rows are not touched.
 *
 * Dry-run (default; counts only, nothing written):
 *   pnpm --filter @cyberlearn/db db:backfill-review-cards
 *   pnpm --filter @cyberlearn/db db:backfill-review-cards --dry-run
 * Apply:
 *   pnpm --filter @cyberlearn/db db:backfill-review-cards --apply
 * Counts per learner and per lesson as well:
 *   pnpm --filter @cyberlearn/db db:backfill-review-cards --verbose
 *
 * Run as ES modules (`node --import tsx/esm`), not with the `tsx` command the
 * other scripts use: reading a lesson's quizzes loads the MDX parser, whose
 * dependencies are ES modules only (estree-walker exports nothing to
 * `require`), and `tsx` loads the package sources as CommonJS.
 */

import {
  CONVERSION_OUTCOMES,
  backfillReviewCards,
  parseBackfillArgs,
  type ConversionOutcome,
} from "../src/backfill-review-cards.js";
import { prisma } from "../src/prisma.js";

const OUTCOME_LABELS: Record<ConversionOutcome, string> = {
  fromAnswers: "converted from the answers on record",
  fromSchedule: "converted from the SM-2 interval (no answer on record)",
  alreadyConverted: "skipped, the learner has cards for the lesson",
  lessonNotFound: "skipped, lesson not read (row added during the run: re-run)",
  notReviewable: "skipped, module review, project or class lesson",
  noQuiz: "skipped, no quiz to ask in the lesson",
};

async function main(): Promise<void> {
  const args = parseBackfillArgs(process.argv.slice(2));
  if (!args.ok) {
    console.error(args.error);
    console.error(
      "Usage: pnpm --filter @cyberlearn/db db:backfill-review-cards [--dry-run | --apply] [--verbose]",
    );
    process.exitCode = 1;
    return;
  }

  const report = await backfillReviewCards({ apply: args.apply });

  console.log(args.apply ? "── APPLY ──" : "── DRY-RUN (pass --apply to write) ──");
  console.log(`Learners with an SM-2 row: ${String(report.users)}`);
  console.log(`SM-2 rows read:            ${String(report.schedules)}`);
  for (const outcome of CONVERSION_OUTCOMES) {
    console.log(`  ${OUTCOME_LABELS[outcome]}: ${String(report.outcomes[outcome])}`);
  }
  if (report.unpublishedLessons > 0) {
    console.log(
      `  of the rows converted, for a draft or archived lesson (cards hidden until it is published): ${String(report.unpublishedLessons)}`,
    );
  }
  console.log(
    args.apply
      ? `Cards created: ${String(report.cardsCreated)} of ${String(report.cardsPlanned)} planned`
      : `Cards to create: ${String(report.cardsPlanned)}`,
  );

  // The spread: the first days one by one, then whatever the old queue had
  // due later than that.
  const days = Object.keys(report.dueDays).sort();
  let later = 0;
  if (days.length > 0) console.log("Cards by due day:");
  for (const day of days) {
    const count = report.dueDays[day] ?? 0;
    if (day > report.lastSpreadDay) later += count;
    else console.log(`  ${day}: ${String(count)}`);
  }
  if (later > 0) console.log(`  later (not due yet in the old queue): ${String(later)}`);

  if (args.verbose) {
    for (const user of report.perUser) {
      console.log(
        `user ${user.userId}: ${String(user.lessons)} lesson(s), ${String(user.cards)} card(s)`,
      );
    }
    for (const lesson of report.perLesson) {
      console.log(
        `lesson ${lesson.slug}: ${String(lesson.learners)} learner(s), ${String(lesson.cards)} card(s)`,
      );
    }
  }

  if (report.cardsPlanned === 0) {
    console.log("Nothing to do - no SM-2 row gives a card now.");
  } else if (!args.apply) {
    console.log("Nothing written. Re-run with --apply.");
  }
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
