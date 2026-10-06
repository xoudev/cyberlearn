-- Exercises finished inside lessons, for the teacher's class view.
--
-- A lesson's page verifies two kinds of exercise on its own: the real Linux
-- terminal (its checks all green) and a Python challenge (its tests all
-- passed). Until now nothing recorded them one by one: a teacher saw lessons
-- completed, never the exercises. Each one finished now writes a row here,
-- once per learner and exercise, and pays a little XP the first time. The
-- browser is the judge, so a row can be forged: it is shown as done, never
-- rewarded like a flag the server checks.

-- AlterEnum
ALTER TYPE "XpSource" ADD VALUE 'EXERCISE';

-- CreateEnum
CREATE TYPE "ExerciseKind" AS ENUM ('TERMINAL', 'PYTHON');

-- CreateTable
CREATE TABLE "exercise_completions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "exerciseId" VARCHAR(200) NOT NULL,
    "kind" "ExerciseKind" NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exercise_completions_userId_lessonId_exerciseId_key" ON "exercise_completions"("userId", "lessonId", "exerciseId");

-- CreateIndex
CREATE INDEX "exercise_completions_lessonId_idx" ON "exercise_completions"("lessonId");

-- AddForeignKey
ALTER TABLE "exercise_completions" ADD CONSTRAINT "exercise_completions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_completions" ADD CONSTRAINT "exercise_completions_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Row level security ──────────────────────────────────────────────────────
-- A learner reads their own rows; a teacher reads their students' through the
-- server (service role), which checks the class first. Nothing grants an
-- insert, an update or a delete: the server writes the rows after checking who
-- asks and which lesson they may open.
ALTER TABLE "exercise_completions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exercise_completions_select_own" ON public.exercise_completions;
CREATE POLICY "exercise_completions_select_own" ON public.exercise_completions FOR SELECT
  USING (public.current_user_role() = 'ADMIN' OR "userId" = auth.uid());

-- Column privileges, as for the other tables the clients read
-- (20260725000000_rls_column_hardening): read only, whatever the defaults grant.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE 'REVOKE ALL ON public.exercise_completions FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.exercise_completions TO authenticated';
END
$$;
