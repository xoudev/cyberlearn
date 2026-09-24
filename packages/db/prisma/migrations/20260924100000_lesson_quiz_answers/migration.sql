-- A lesson's quiz answers, and its score.
--
-- A wrong answer used to be retried until it was right, so a lesson ended the
-- same whatever the learner knew. Now the first answer is kept and scored on
-- the server, and the lesson's score (right answers out of its quizzes) is
-- fixed on its progress row when it is completed.

-- AlterTable
ALTER TABLE "user_lesson_progress" ADD COLUMN     "quizCorrect" SMALLINT,
ADD COLUMN     "quizTotal" SMALLINT;

-- CreateTable
CREATE TABLE "lesson_quiz_answers" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "quizId" VARCHAR(100) NOT NULL,
    "selected" SMALLINT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_quiz_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lesson_quiz_answers_lessonId_idx" ON "lesson_quiz_answers"("lessonId");

-- One answer per person, lesson and quiz: the unique index is what makes the
-- first answer the only one, even when two submissions race.
CREATE UNIQUE INDEX "lesson_quiz_answers_userId_lessonId_quizId_key" ON "lesson_quiz_answers"("userId", "lessonId", "quizId");

-- AddForeignKey
ALTER TABLE "lesson_quiz_answers" ADD CONSTRAINT "lesson_quiz_answers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_quiz_answers" ADD CONSTRAINT "lesson_quiz_answers_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ─── Row level security ──────────────────────────────────────────────────────
-- A person reads their own answers (the mobile app shows them when a lesson is
-- reopened), and nobody else's. Nothing grants an insert, an update or a
-- delete: an answer is written by the server, which decides whether it is
-- right from the lesson itself. Through the Data API a client could otherwise
-- record a right answer it never gave, or erase a wrong one and try again.
ALTER TABLE "lesson_quiz_answers" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesson_quiz_answers_select_own" ON public.lesson_quiz_answers;
CREATE POLICY "lesson_quiz_answers_select_own" ON public.lesson_quiz_answers FOR SELECT
  USING (public.current_user_role() = 'ADMIN' OR "userId" = auth.uid());

-- Column privileges, as for the other tables the clients read
-- (20260725000000_rls_column_hardening): read only, whatever the defaults grant.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE 'REVOKE ALL ON public.lesson_quiz_answers FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.lesson_quiz_answers TO authenticated';
END
$$;
