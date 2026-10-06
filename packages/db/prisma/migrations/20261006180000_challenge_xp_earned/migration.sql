-- user_challenge_progress: the XP a solve was worth.
--
-- The challenge of the week is worth twice its reward
-- (@cyberlearn/lib/challenges/weekly), so the reward alone no longer says what
-- a learner earned. Written once, by the transaction that marks the challenge
-- solved; null before that, and for the solves recorded before this column. No
-- policy to add: the table keeps the policies it has.

-- AlterTable
ALTER TABLE "user_challenge_progress" ADD COLUMN     "xpEarned" INTEGER;
