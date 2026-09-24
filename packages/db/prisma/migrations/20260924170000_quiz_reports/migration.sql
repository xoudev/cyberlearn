-- Learners pointing out a lesson quiz that is wrong.
--
-- A tester found questions worded ambiguously. With one answer per question,
-- an ambiguous one costs a point for nothing, and nobody on the team hears of
-- it. A learner can now report a question (ambiguous, doubtful answer key,
-- typo, other) with an optional comment; the console lists them grouped by
-- question.

-- CreateEnum
CREATE TYPE "QuizReportReason" AS ENUM ('AMBIGUOUS', 'WRONG_ANSWER', 'TYPO', 'OTHER');

-- CreateEnum
CREATE TYPE "QuizReportStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "quiz_reports" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "lessonId" UUID NOT NULL,
    "quizId" VARCHAR(100) NOT NULL,
    "reason" "QuizReportReason" NOT NULL,
    "comment" VARCHAR(500),
    "status" "QuizReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "quiz_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quiz_reports_lessonId_quizId_idx" ON "quiz_reports"("lessonId", "quizId");

-- CreateIndex
CREATE INDEX "quiz_reports_status_idx" ON "quiz_reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_reports_userId_lessonId_quizId_key" ON "quiz_reports"("userId", "lessonId", "quizId");

-- AddForeignKey
ALTER TABLE "quiz_reports" ADD CONSTRAINT "quiz_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_reports" ADD CONSTRAINT "quiz_reports_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- One report per learner and question: reporting again updates the row.
-- A null userId (an erased account) does not collide, which is what keeps
-- those reports.

-- ─── Row level security ──────────────────────────────────────────────────────
-- A learner reads their own reports (the app shows a question already
-- reported as such), and nobody else's: a comment is written for the team.
-- Nothing grants an insert, an update or a delete. A report is written by the
-- server, which checks the lesson can be read and the question exists, and
-- keeps the reporter's identity out of the client's hands.
ALTER TABLE "quiz_reports" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz_reports_select_own" ON public.quiz_reports;
CREATE POLICY "quiz_reports_select_own" ON public.quiz_reports FOR SELECT
  USING (public.current_user_role() = 'ADMIN' OR "userId" = auth.uid());

-- Column privileges, as for the other tables the clients read
-- (20260725000000_rls_column_hardening): read only, whatever the defaults grant.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE 'REVOKE ALL ON public.quiz_reports FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.quiz_reports TO authenticated';
END
$$;
