/**
 * One-shot backfill — credit Badge.xpReward for badges earned before
 * crediting existed. Idempotent (rows are stamped with context.xpCredited in
 * the same transaction as the XP update; re-runs are no-ops).
 *
 * Dry-run (default):
 *   pnpm --filter @cyberlearn/db db:backfill-badge-xp
 * Apply:
 *   pnpm --filter @cyberlearn/db db:backfill-badge-xp --apply
 */

import { backfillBadgeXp } from "../src/backfill-badge-xp.js";
import { prisma } from "../src/prisma.js";

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const report = await backfillBadgeXp(apply);

  console.log(apply ? "── APPLY ──" : "── DRY-RUN (pass --apply to write) ──");
  console.log(`Unstamped user_badges rows: ${String(report.totalUnstampedRows)}`);

  for (const u of report.users) {
    console.log(
      `user ${u.userId}: ${String(u.unstampedBadges)} badge(s), ` +
        `+${String(u.xpDelta)} XP (${String(u.xpBefore)} -> ${String(u.xpAfter)}), ` +
        `level ${String(u.levelBefore)} -> ${String(u.levelAfter)}`,
    );
  }

  if (report.users.length === 0) {
    console.log("Nothing to do — all rows already credited.");
  }
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
