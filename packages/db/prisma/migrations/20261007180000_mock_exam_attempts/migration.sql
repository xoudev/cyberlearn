-- Mock exams (examens blancs): a timed draw over a path's lesson quizzes, a few
-- questions from each module, scored by module the way a certification reports
-- its domains. Practice only: no certificate, no XP, no waiting period.
--
-- An attempt stores which quizzes were drawn (lesson and quiz id) and in which
-- option order, never the answer key: that stays in the lessons, read on the
-- server when the attempt is handed in.

-- CreateTable
CREATE TABLE "mock_exam_attempts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "pathId" UUID NOT NULL,
    "questions" JSONB NOT NULL,
    "answers" JSONB,
    "score" INTEGER,
    "domains" JSONB,
    "timeLimitMinutes" INTEGER NOT NULL,
    "late" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "mock_exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mock_exam_attempts_userId_pathId_startedAt_idx" ON "mock_exam_attempts"("userId", "pathId", "startedAt");

-- AddForeignKey
ALTER TABLE "mock_exam_attempts" ADD CONSTRAINT "mock_exam_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exam_attempts" ADD CONSTRAINT "mock_exam_attempts_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Row level security ──────────────────────────────────────────────────────
-- A learner reads their own attempts and nobody else's. Nothing grants an
-- insert, an update or a delete: the server writes the rows, after checking
-- who asks and which path they may open.
ALTER TABLE "mock_exam_attempts" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mock_exam_attempts_select_own" ON public.mock_exam_attempts;
CREATE POLICY "mock_exam_attempts_select_own" ON public.mock_exam_attempts FOR SELECT
  USING (public.current_user_role() = 'ADMIN' OR "userId" = auth.uid());

-- Column privileges, as for the other tables the clients read
-- (20260725000000_rls_column_hardening): read only, whatever the defaults grant.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE 'REVOKE ALL ON public.mock_exam_attempts FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.mock_exam_attempts TO authenticated';
END
$$;
