-- Add SCRIPT to ChallengeType enum
ALTER TYPE "ChallengeType" ADD VALUE IF NOT EXISTS 'SCRIPT';

-- Add starterCode column to challenges
ALTER TABLE "challenges" ADD COLUMN IF NOT EXISTS "starterCode" TEXT;
