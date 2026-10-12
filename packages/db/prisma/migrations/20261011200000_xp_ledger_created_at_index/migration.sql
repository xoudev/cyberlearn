-- xp_ledger: an index led by createdAt, for the week's and the month's boards.
--
-- leaderboardRepository.findTopUsersSince sums every player's XP since Monday
-- or since the 1st: a range on createdAt across all users. The only index was
-- ("userId", "createdAt"), whose leading column is userId, so each of those
-- boards read the whole ledger, which grows with every XP credit. This one
-- reaches the period's rows directly, userId alongside for the grouping.
--
-- Index only: no column, no table, no policy changes.

-- CreateIndex
CREATE INDEX "xp_ledger_createdAt_userId_idx" ON "xp_ledger"("createdAt", "userId");
