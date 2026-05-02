-- CreateEnum
CREATE TYPE "ChallengeType" AS ENUM ('CTF', 'PUZZLE', 'LAB');

-- CreateTable
CREATE TABLE "challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "refCode" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "instructions" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "type" "ChallengeType" NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "timeLimitMin" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "flag" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "prerequisiteId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_challenge_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "challengeId" UUID NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "user_challenge_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "challenges_refCode_key" ON "challenges"("refCode");
CREATE UNIQUE INDEX "challenges_slug_key" ON "challenges"("slug");
CREATE INDEX "challenges_category_difficulty_isActive_idx" ON "challenges"("category", "difficulty", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "user_challenge_progress_userId_challengeId_key" ON "user_challenge_progress"("userId", "challengeId");
CREATE INDEX "user_challenge_progress_userId_idx" ON "user_challenge_progress"("userId");

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_prerequisiteId_fkey"
    FOREIGN KEY ("prerequisiteId") REFERENCES "challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_challenge_progress" ADD CONSTRAINT "user_challenge_progress_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_challenge_progress" ADD CONSTRAINT "user_challenge_progress_challengeId_fkey"
    FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
