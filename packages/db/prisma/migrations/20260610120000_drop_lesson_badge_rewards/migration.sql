-- Drop the dead lesson_badge_rewards join table.
-- It was never read or written by any code path (no repository method, no
-- service, no seed insert): lesson-specific badge awarding is driven by the
-- LESSON_SPECIFIC criterion type with Badge.criterionData.lessonId instead.
-- Its RLS enable + policy are removed from post_prisma_rls.sql in the same
-- change so the psql ON_ERROR_STOP run in CI keeps applying cleanly.

-- DropForeignKey
ALTER TABLE "lesson_badge_rewards" DROP CONSTRAINT "lesson_badge_rewards_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "lesson_badge_rewards" DROP CONSTRAINT "lesson_badge_rewards_badgeId_fkey";

-- DropTable
DROP TABLE "lesson_badge_rewards";
