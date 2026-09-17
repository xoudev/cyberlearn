-- CreateEnum
CREATE TYPE "ModerationVerdict" AS ENUM ('ALLOW', 'REVIEW', 'BLOCK');

-- CreateEnum
CREATE TYPE "ModerationOutcome" AS ENUM ('PENDING', 'UPHELD', 'OVERTURNED');

-- CreateTable
CREATE TABLE "moderation_events" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "surface" VARCHAR(40) NOT NULL,
    "contentId" UUID,
    "verdict" "ModerationVerdict" NOT NULL,
    "score" INTEGER NOT NULL,
    "findings" JSONB NOT NULL,
    "excerpt" VARCHAR(500) NOT NULL,
    "outcome" "ModerationOutcome" NOT NULL DEFAULT 'PENDING',
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "moderation_events_outcome_createdAt_idx" ON "moderation_events"("outcome", "createdAt");

-- CreateIndex
CREATE INDEX "moderation_events_userId_idx" ON "moderation_events"("userId");

-- AddForeignKey
ALTER TABLE "moderation_events" ADD CONSTRAINT "moderation_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_events" ADD CONSTRAINT "moderation_events_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─── Row level security ──────────────────────────────────────────────────────
-- Administrators only. A moderation record holds the text that was refused and
-- names who wrote it; showing someone their own would be showing them the
-- excerpt of whatever they tried to publish, which helps nobody and tells them
-- exactly what the filter caught. Writes go through Prisma as the table owner.
ALTER TABLE "moderation_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moderation_events_select_admin" ON public.moderation_events FOR SELECT
  USING (public.current_user_role() = 'ADMIN');
