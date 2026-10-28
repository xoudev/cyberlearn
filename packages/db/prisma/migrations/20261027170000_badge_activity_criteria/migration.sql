-- Badge criteria for what is played outside lessons: challenges, duels,
-- tournaments and the daily recall (packages/lib badge-evaluator.ts).
-- The new values are not used in this migration: Postgres refuses a value
-- added in the same transaction.
ALTER TYPE "BadgeCriterionType" ADD VALUE IF NOT EXISTS 'CHALLENGES_SOLVED';
ALTER TYPE "BadgeCriterionType" ADD VALUE IF NOT EXISTS 'DUELS_PLAYED';
ALTER TYPE "BadgeCriterionType" ADD VALUE IF NOT EXISTS 'DUELS_WON';
ALTER TYPE "BadgeCriterionType" ADD VALUE IF NOT EXISTS 'TOURNAMENTS_PLAYED';
ALTER TYPE "BadgeCriterionType" ADD VALUE IF NOT EXISTS 'TOURNAMENT_RANK';
ALTER TYPE "BadgeCriterionType" ADD VALUE IF NOT EXISTS 'DAILY_RECALLS';

-- A solve of the challenge of the week, recorded as such: which challenge
-- held the week cannot be worked out afterwards, the catalogue having changed.
-- The table keeps its RLS and its policies; only a column is added.
ALTER TABLE "user_challenge_progress" ADD COLUMN IF NOT EXISTS "weekly" BOOLEAN NOT NULL DEFAULT false;

-- The solves before this column: the week's bonus paid twice the reward
-- (challengeXp), which is what xpEarned kept.
UPDATE "user_challenge_progress" AS p
SET "weekly" = true
FROM "challenges" AS c
WHERE c."id" = p."challengeId"
  AND p."status" = 'COMPLETED'
  AND p."xpEarned" IS NOT NULL
  AND c."xpReward" > 0
  AND p."xpEarned" >= c."xpReward" * 2;
