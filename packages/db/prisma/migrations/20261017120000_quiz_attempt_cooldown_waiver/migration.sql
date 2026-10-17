-- quiz_attempts: the wait after an exam attempt, lifted by an administrator.
--
-- A path's final exam opens again 48 hours after an attempt is handed in
-- (QUIZ_COOLDOWN_MINUTES, packages/lib/src/quiz/quiz.ts), and nothing could
-- shorten it: a learner whose attempt was cut short by a lost connection, or
-- marked down by a question since corrected, waited the two days anyway. The
-- console now stamps cooldownWaivedAt on the attempt the wait comes from, and
-- the exam no longer counts that wait (isInCooldown, and examStatus and
-- startExam in apps/web/lib/exam/exam-service.ts). The attempt keeps its
-- score and its dates.
--
-- No policy to add: a column of a table whose RLS is already on. Its policies
-- (20260610200000_rls_baseline) let a learner read their own attempts and an
-- administrator all of them, and no client role writes the table: the site and
-- the app go through the server, which writes with Prisma.

-- AlterTable
ALTER TABLE "quiz_attempts" ADD COLUMN     "cooldownWaivedAt" TIMESTAMP(3);
