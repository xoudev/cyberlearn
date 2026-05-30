-- CreateEnum
CREATE TYPE "LeaderboardVisibility" AS ENUM ('HIDDEN', 'ANONYMOUS', 'PUBLIC');

-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "leaderboardVisibility" "LeaderboardVisibility" NOT NULL DEFAULT 'ANONYMOUS',
ADD COLUMN     "streakReminder" BOOLEAN NOT NULL DEFAULT true;
