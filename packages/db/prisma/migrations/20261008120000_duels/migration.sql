-- Quiz duels between friends: the same questions, drawn from a path's lesson
-- quizzes, answered by both, the most right answers winning (on a tie, whoever
-- finished first). A duel waits a day to be accepted, then lasts a day.
--
-- A duel stores which quizzes were drawn and in which option order, never the
-- answer key: each answer is checked on the server, against the lesson, when
-- it is given.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'DUEL_INVITE';
ALTER TYPE "NotificationType" ADD VALUE 'DUEL_RESULT';

-- CreateEnum
CREATE TYPE "DuelStatus" AS ENUM ('PENDING', 'ACTIVE', 'FINISHED', 'DECLINED', 'EXPIRED');

-- CreateTable
CREATE TABLE "duels" (
    "id" UUID NOT NULL,
    "challengerId" UUID NOT NULL,
    "opponentId" UUID NOT NULL,
    "pathId" UUID NOT NULL,
    "status" "DuelStatus" NOT NULL DEFAULT 'PENDING',
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "winnerId" UUID,

    CONSTRAINT "duels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duel_answers" (
    "id" UUID NOT NULL,
    "duelId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "index" INTEGER NOT NULL,
    "selected" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "duel_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "duels_challengerId_status_idx" ON "duels"("challengerId", "status");

-- CreateIndex
CREATE INDEX "duels_opponentId_status_idx" ON "duels"("opponentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "duel_answers_duelId_userId_index_key" ON "duel_answers"("duelId", "userId", "index");

-- AddForeignKey
ALTER TABLE "duels" ADD CONSTRAINT "duels_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duels" ADD CONSTRAINT "duels_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duels" ADD CONSTRAINT "duels_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duel_answers" ADD CONSTRAINT "duel_answers_duelId_fkey" FOREIGN KEY ("duelId") REFERENCES "duels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duel_answers" ADD CONSTRAINT "duel_answers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Row level security ──────────────────────────────────────────────────────
-- The two players read their duel and its answers, nobody else does. Nothing
-- grants an insert, an update or a delete: the server writes the rows, after
-- checking the two are friends, the duel is theirs and still running.
ALTER TABLE "duels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "duel_answers" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "duels_select_players" ON public.duels;
CREATE POLICY "duels_select_players" ON public.duels FOR SELECT
  USING (
    public.current_user_role() = 'ADMIN'
    OR "challengerId" = auth.uid()
    OR "opponentId" = auth.uid()
  );

DROP POLICY IF EXISTS "duel_answers_select_players" ON public.duel_answers;
CREATE POLICY "duel_answers_select_players" ON public.duel_answers FOR SELECT
  USING (
    public.current_user_role() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.duels d
      WHERE d.id = duel_answers."duelId"
        AND (d."challengerId" = auth.uid() OR d."opponentId" = auth.uid())
    )
  );

-- Column privileges, as for the other tables the clients read
-- (20260725000000_rls_column_hardening): read only, whatever the defaults grant.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE 'REVOKE ALL ON public.duels FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.duels TO authenticated';
  EXECUTE 'REVOKE ALL ON public.duel_answers FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.duel_answers TO authenticated';
END
$$;
