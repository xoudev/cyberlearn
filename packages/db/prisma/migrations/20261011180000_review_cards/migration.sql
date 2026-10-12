-- Review cards: one lesson quiz question a learner is asked again, in Leitner
-- boxes (due again 1, 3, 7, then 21 days later, then retired), and the day's
-- review session they are drawn into, six at most.
--
-- Added alongside review_schedules, which keeps feeding the lesson-level
-- queue until the cards replace it. A card refers to its question by lesson
-- and quiz id, never copies it: it is asked as the lesson has it now. A
-- session stores which cards were drawn and in which option order, never the
-- answer key, and exists once per learner and day, so it is graded and its XP
-- credited once.

-- CreateTable
CREATE TABLE "review_cards" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "quizId" VARCHAR(100) NOT NULL,
    "box" SMALLINT NOT NULL DEFAULT 1,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "lapses" SMALLINT NOT NULL DEFAULT 0,
    "everCorrect" BOOLEAN NOT NULL DEFAULT false,
    "lastAnsweredAt" TIMESTAMP(3),
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "day" DATE NOT NULL,
    "draw" JSONB NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "completedAt" TIMESTAMP(3),
    "xpCredited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_cards_userId_dueAt_idx" ON "review_cards"("userId", "dueAt");

-- One card per person, lesson and question: the unique index is what makes
-- enqueueing the same question twice (a replayed completion) a no-op.
CREATE UNIQUE INDEX "review_cards_userId_lessonId_quizId_key" ON "review_cards"("userId", "lessonId", "quizId");

-- One session per person and day: a second tab gets the first one back.
CREATE UNIQUE INDEX "review_sessions_userId_day_key" ON "review_sessions"("userId", "day");

-- AddForeignKey
ALTER TABLE "review_cards" ADD CONSTRAINT "review_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_cards" ADD CONSTRAINT "review_cards_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_sessions" ADD CONSTRAINT "review_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Row level security ──────────────────────────────────────────────────────
-- A learner reads their own cards and sessions, and nobody else's. Nothing
-- grants an insert, an update or a delete: the server writes the rows, having
-- checked the answer against the lesson. Through the Data API a client could
-- otherwise move a card up a box it never earned, retire the questions it
-- keeps missing, or mark a session done to be credited for it.
ALTER TABLE "review_cards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "review_sessions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_cards_select_own" ON public.review_cards;
CREATE POLICY "review_cards_select_own" ON public.review_cards FOR SELECT
  USING (public.current_user_role() = 'ADMIN' OR "userId" = auth.uid());

DROP POLICY IF EXISTS "review_sessions_select_own" ON public.review_sessions;
CREATE POLICY "review_sessions_select_own" ON public.review_sessions FOR SELECT
  USING (public.current_user_role() = 'ADMIN' OR "userId" = auth.uid());

-- Column privileges, as for the other tables the clients read
-- (20260725000000_rls_column_hardening): read only, whatever the defaults grant.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE 'REVOKE ALL ON public.review_cards FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.review_cards TO authenticated';
  EXECUTE 'REVOKE ALL ON public.review_sessions FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.review_sessions TO authenticated';
END
$$;
