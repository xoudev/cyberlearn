-- Weekly quests that rotate: three new kinds, a level per quest, and the
-- table holding each week's draw. The pool itself is the next migration: a new
-- enum value cannot be used in the transaction that adds it.

-- AlterEnum
ALTER TYPE "QuestType" ADD VALUE IF NOT EXISTS 'CHALLENGE_SOLVED';
ALTER TYPE "QuestType" ADD VALUE IF NOT EXISTS 'DAILY_RECALL';
ALTER TYPE "QuestType" ADD VALUE IF NOT EXISTS 'EXERCISE_PASSED';

-- AlterTable: 1 for a short quest, 2 for a longer one (the week's mix).
ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "level" SMALLINT NOT NULL DEFAULT 1;

-- CreateTable: the quests each week asks for, the same for everyone.
CREATE TABLE IF NOT EXISTS "weekly_quest_sets" (
    "weekKey" VARCHAR(10) NOT NULL,
    "questId" UUID NOT NULL,
    "position" SMALLINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_quest_sets_pkey" PRIMARY KEY ("weekKey", "questId")
);

-- AddForeignKey
ALTER TABLE "weekly_quest_sets" DROP CONSTRAINT IF EXISTS "weekly_quest_sets_questId_fkey";
ALTER TABLE "weekly_quest_sets" ADD CONSTRAINT "weekly_quest_sets_questId_fkey" FOREIGN KEY ("questId") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── RLS (same migration as the table, per project convention) ───────────────
-- The week's draw is the same for every learner and says nothing about anyone:
-- readable by any signed-in account, like the quest catalogue. Written by the
-- server only (Prisma / service_role bypasses RLS); admin may do anything.
ALTER TABLE public.weekly_quest_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weekly_quest_sets_select_authenticated" ON public.weekly_quest_sets;
CREATE POLICY "weekly_quest_sets_select_authenticated" ON public.weekly_quest_sets FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "weekly_quest_sets_admin_all" ON public.weekly_quest_sets;
CREATE POLICY "weekly_quest_sets_admin_all" ON public.weekly_quest_sets FOR ALL
  USING (public.current_user_role() = 'ADMIN');
