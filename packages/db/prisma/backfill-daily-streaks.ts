/**
 * One-shot backfill for the daily-streak feature.
 *
 * Reconstructs each user's per-day activity history from their COMPLETED lessons
 * (the real completion dates, in Europe/Paris) into user_activity_days, and
 * raises longestStreak to the longest consecutive run found. The live
 * currentStreak / lastActiveAt are NOT touched (no fabricated current streak),
 * and freezes already default to 1 from the migration.
 *
 * Idempotent: existing activity-day rows are skipped, and longestStreak is only
 * raised (never lowered) - re-runs are no-ops.
 *
 * Dry-run (default):
 *   pnpm --filter @cyberlearn/db db:backfill-daily-streaks
 * Apply:
 *   pnpm --filter @cyberlearn/db db:backfill-daily-streaks --apply
 */

import { dayKey, daysBetween } from "@cyberlearn/lib";
import { prisma } from "../src/prisma.js";

/** Longest run of consecutive calendar days in a set of day-keys. */
function longestRun(dayKeys: string[]): number {
  if (dayKeys.length === 0) return 0;
  const sorted = [...dayKeys].sort();
  let best = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const day = sorted[i];
    if (prev === undefined || day === undefined) continue;
    const gap = daysBetween(prev, day);
    if (gap === 1) {
      current += 1;
      best = Math.max(best, current);
    } else if (gap > 1) {
      current = 1;
    }
  }
  return best;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");

  const rows = await prisma.userLessonProgress.findMany({
    where: { status: "COMPLETED", completedAt: { not: null } },
    select: { userId: true, completedAt: true },
  });

  // userId -> (dayKey -> activity count)
  const byUser = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (!row.completedAt) continue;
    const key = dayKey(row.completedAt);
    let days = byUser.get(row.userId);
    if (!days) {
      days = new Map<string, number>();
      byUser.set(row.userId, days);
    }
    days.set(key, (days.get(key) ?? 0) + 1);
  }

  const existing = await prisma.userActivityDay.findMany({ select: { userId: true, day: true } });
  const existingKeys = new Set(existing.map((e) => `${e.userId}:${dayKey(e.day)}`));

  const toInsert: { userId: string; day: Date; count: number }[] = [];
  const runByUser: { userId: string; run: number }[] = [];
  for (const [userId, days] of byUser) {
    for (const [key, count] of days) {
      if (!existingKeys.has(`${userId}:${key}`)) {
        toInsert.push({ userId, day: new Date(key), count });
      }
    }
    runByUser.push({ userId, run: longestRun([...days.keys()]) });
  }

  console.log(apply ? "── APPLY ──" : "── DRY-RUN (pass --apply to write) ──");
  console.log(`Users with completed lessons: ${String(byUser.size)}`);
  console.log(`Activity-day rows to insert:  ${String(toInsert.length)}`);

  if (!apply) {
    console.log("Nothing written. Re-run with --apply.");
    return;
  }

  if (toInsert.length > 0) {
    await prisma.userActivityDay.createMany({ data: toInsert, skipDuplicates: true });
  }

  let raised = 0;
  for (const { userId, run } of runByUser) {
    const res = await prisma.user.updateMany({
      where: { id: userId, longestStreak: { lt: run } },
      data: { longestStreak: run },
    });
    raised += res.count;
  }

  console.log(`Inserted ${String(toInsert.length)} activity days.`);
  console.log(`Raised longestStreak for ${String(raised)} user(s).`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
