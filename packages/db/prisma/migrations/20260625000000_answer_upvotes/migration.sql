-- One row per (answer, user): a user can upvote a given answer at most once. The
-- denormalized lesson_answers.upvotes count is kept in sync server-side. Without
-- this, the upvote action incremented unconditionally - any user could farm
-- upvotes (including on their own answer) by replaying the action.

-- CreateTable
CREATE TABLE "lesson_answer_upvotes" (
    "id" UUID NOT NULL,
    "answerId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_answer_upvotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lesson_answer_upvotes_answerId_userId_key" ON "lesson_answer_upvotes"("answerId", "userId");
CREATE INDEX "lesson_answer_upvotes_answerId_idx" ON "lesson_answer_upvotes"("answerId");

-- AddForeignKey
ALTER TABLE "lesson_answer_upvotes" ADD CONSTRAINT "lesson_answer_upvotes_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "lesson_answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_answer_upvotes" ADD CONSTRAINT "lesson_answer_upvotes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── RLS (same migration as the table, per project convention) ───────────────
-- Own votes readable; written server-side only (the upvote action via
-- service_role), so there is no client write policy - the count is infalsifiable.
ALTER TABLE public.lesson_answer_upvotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "answer_upvote_self_select" ON public.lesson_answer_upvotes;
CREATE POLICY "answer_upvote_self_select" ON public.lesson_answer_upvotes FOR SELECT
  USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "answer_upvote_admin_all" ON public.lesson_answer_upvotes;
CREATE POLICY "answer_upvote_admin_all" ON public.lesson_answer_upvotes FOR ALL
  USING (public.current_user_role() = 'ADMIN');
