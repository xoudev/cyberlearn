/**
 * Dev-only — resets a user's gamification state and progress.
 * Run with: pnpm --filter @cyberlearn/db tsx prisma/reset-user.ts <email>
 *
 * Resets: XP, level, streak, all lesson progress, all earned badges, all notifications.
 * Does NOT delete the user account or re-trigger onboarding.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: tsx prisma/reset-user.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, displayName: true },
  });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  console.log(`Resetting: ${user.displayName ?? user.email} (${user.id})`);

  const [progress, badges, notifications] = await Promise.all([
    prisma.userLessonProgress.deleteMany({ where: { userId: user.id } }),
    prisma.userBadge.deleteMany({ where: { userId: user.id } }),
    prisma.notification.deleteMany({ where: { userId: user.id } }),
  ]);

  await prisma.user.update({
    where: { id: user.id },
    data: { xpTotal: 0, level: 1, streakDays: 0, lastActiveAt: new Date() },
  });

  console.log(`✅ Reset complete`);
  console.log(`   - ${String(progress.count)} lesson progress records deleted`);
  console.log(`   - ${String(badges.count)} badges deleted`);
  console.log(`   - ${String(notifications.count)} notifications deleted`);
  console.log(`   - XP → 0, Level → 1, Streak → 0`);
}

main()
  .catch((e) => {
    console.error("❌ Reset failed:", e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
