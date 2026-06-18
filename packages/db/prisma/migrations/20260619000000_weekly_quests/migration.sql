-- Weekly quests: catalog (Quest) + per-user weekly progress (UserQuestProgress).

-- CreateEnum
CREATE TYPE "QuestType" AS ENUM ('LESSON_COMPLETED', 'PERFECT_QUIZ', 'STREAK_DAYS', 'FORUM_POST', 'WEEKLY_BONUS');

-- CreateTable: quest catalog
CREATE TABLE "quests" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "QuestType" NOT NULL,
    "target" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "freezeReward" INTEGER NOT NULL DEFAULT 0,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable: per-user weekly progress
CREATE TABLE "user_quest_progress" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "questId" UUID NOT NULL,
    "weekKey" VARCHAR(10) NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_quest_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quests_code_key" ON "quests"("code");
CREATE UNIQUE INDEX "user_quest_progress_userId_questId_weekKey_key" ON "user_quest_progress"("userId", "questId", "weekKey");
CREATE INDEX "user_quest_progress_userId_weekKey_idx" ON "user_quest_progress"("userId", "weekKey");

-- AddForeignKey
ALTER TABLE "user_quest_progress" ADD CONSTRAINT "user_quest_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_quest_progress" ADD CONSTRAINT "user_quest_progress_questId_fkey" FOREIGN KEY ("questId") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── RLS (same migration as the tables, per project convention) ──────────────
-- quests: catalog readable by anyone (active rows) or admin; writes admin-only.
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quests_select_active" ON public.quests;
CREATE POLICY "quests_select_active" ON public.quests FOR SELECT
  USING ("isActive" = true OR public.current_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "quests_admin_all" ON public.quests;
CREATE POLICY "quests_admin_all" ON public.quests FOR ALL
  USING (public.current_user_role() = 'ADMIN');

-- user_quest_progress: written server-side only (Prisma / service_role bypasses
-- RLS). Clients may read only their own rows; no client writes (infalsifiable).
ALTER TABLE public.user_quest_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quest_progress_self_select" ON public.user_quest_progress;
CREATE POLICY "quest_progress_self_select" ON public.user_quest_progress FOR SELECT
  USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "quest_progress_admin_all" ON public.user_quest_progress;
CREATE POLICY "quest_progress_admin_all" ON public.user_quest_progress FOR ALL
  USING (public.current_user_role() = 'ADMIN');

-- ─── Seed the fixed weekly quest set (idempotent) ────────────────────────────
INSERT INTO "quests" ("id", "code", "title", "description", "type", "target", "xpReward", "freezeReward", "orderIndex", "isActive", "createdAt") VALUES
  (gen_random_uuid(), 'FINISH_3_LESSONS', 'Termine 3 leçons', 'Complète 3 leçons cette semaine.', 'LESSON_COMPLETED', 3, 300, 0, 1, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'PERFECT_QUIZ', 'Réussis un quiz à 100%', 'Obtiens 100 % à un quiz.', 'PERFECT_QUIZ', 1, 250, 0, 2, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'STREAK_5_DAYS', 'Garde ta série 5 jours', 'Atteins une série de 5 jours.', 'STREAK_DAYS', 5, 400, 0, 3, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'FORUM_WRITEUP', 'Poste un write-up sur le forum', 'Publie une réponse dans la Q&A d''une leçon.', 'FORUM_POST', 1, 350, 0, 4, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'WEEKLY_BONUS', 'Bonus complétion', 'Complète les 4 quêtes de la semaine.', 'WEEKLY_BONUS', 4, 500, 1, 5, true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
