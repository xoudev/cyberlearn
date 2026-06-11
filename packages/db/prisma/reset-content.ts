/**
 * One-shot CONTENT wipe - removes every lesson, path and challenge to restart
 * authoring from a clean base.
 *
 * Deletes (cascades included):
 *   - challenges (+ hints, hint reveals, user progress)
 *   - paths (+ path_lessons, path progress, quizzes, quiz questions/attempts,
 *     certificates, path ratings)
 *   - lessons (+ lesson progress, review schedules, Q&A, lesson ratings,
 *     prerequisites, skip waivers)
 *   - contact tickets and audit logs (fresh-start bookkeeping)
 *
 * Keeps: accounts (wipe them with `pnpm reset:users`, which cascades all
 * per-user data), the badge catalog, and the placement questions.
 *
 * DRY-RUN by default. Run with:
 *   pnpm --filter @cyberlearn/db db:reset-content           (report only)
 *   pnpm --filter @cyberlearn/db db:reset-content --apply   (delete)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function main(): Promise<void> {
  const toDelete = {
    lessons: await prisma.lesson.count(),
    paths: await prisma.path.count(),
    quizzes: await prisma.quiz.count(),
    certificates: await prisma.certificate.count(),
    challenges: await prisma.challenge.count(),
    contactTickets: await prisma.contactTicket.count(),
    auditLogs: await prisma.auditLog.count(),
  };
  const untouched = {
    users: await prisma.user.count(),
    badges: await prisma.badge.count(),
    placementQuestions: await prisma.placementQuestion.count(),
  };

  console.log(apply ? "== APPLY MODE ==" : "== DRY RUN (pass --apply to delete) ==");
  console.log("Will delete (dependents cascade):", toDelete);
  console.log("Untouched:", untouched);
  console.log("Accounts are NOT touched by this script: run `pnpm reset:users` for those.");

  if (!apply) return;

  // Roots only: every dependent table cascades from these (schema onDelete).
  const challenges = await prisma.challenge.deleteMany({});
  const paths = await prisma.path.deleteMany({});
  const lessons = await prisma.lesson.deleteMany({});
  const tickets = await prisma.contactTicket.deleteMany({});
  const logs = await prisma.auditLog.deleteMany({});

  console.log("Deleted:", {
    challenges: challenges.count,
    paths: paths.count,
    lessons: lessons.count,
    contactTickets: tickets.count,
    auditLogs: logs.count,
  });
  console.log("Remaining certificates:", await prisma.certificate.count(), "(0 expected)");
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
