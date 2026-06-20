-- Global season rank: a member's rank by seasonXp across the WHOLE season (all
-- pods), distinct from finalRank which is pod-local (1..15). Set at rollover,
-- nullable until the season closes. Powers the Wrapped end-of-season card.
-- No RLS change: league_memberships already enforces it.

ALTER TABLE "league_memberships" ADD COLUMN "globalRank" INTEGER;
