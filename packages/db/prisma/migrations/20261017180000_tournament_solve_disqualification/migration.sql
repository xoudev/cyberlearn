-- tournament_solves: the console disqualifies a flag found during a tournament.
--
-- The row stays rather than being deleted. A deleted solve would let the
-- player submit the same flag again and score it a second time; kept and
-- marked, it scores for nobody (tournamentRepository.listSolves leaves it out
-- of every scoreboard, on the site and in the app) and still answers "already
-- found" to a new submission. The reason and the date are the player's to
-- read; which administrator took the flag back is not, as tournaments keep
-- who composed them to themselves.
--
-- No table and no policy: three columns, one foreign key, and the column
-- grants that keep the new administrator id away from the Data API. The row
-- policy (tournament_solves_select_own) is unchanged.

-- AlterTable
ALTER TABLE "tournament_solves" ADD COLUMN     "disqualifiedAt" TIMESTAMP(3),
ADD COLUMN     "disqualifiedById" UUID,
ADD COLUMN     "disqualifiedReason" VARCHAR(300);

-- CreateIndex
CREATE INDEX "tournament_solves_disqualifiedById_idx" ON "tournament_solves"("disqualifiedById");

-- AddForeignKey
ALTER TABLE "tournament_solves" ADD CONSTRAINT "tournament_solves_disqualifiedById_fkey" FOREIGN KEY ("disqualifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Column privileges. 20261008180000_tournaments granted SELECT on the whole
-- table, which would now include "disqualifiedById": the table grant goes,
-- and every column but that one is granted back.
DO $$
BEGIN
  -- Plain Postgres (some local setups) has no Supabase roles: nothing to grant.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE 'REVOKE ALL ON public.tournament_solves FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ("id", "tournamentId", "challengeId", "userId", "classId", "points", "solvedAt", "disqualifiedAt", "disqualifiedReason") ON public.tournament_solves TO authenticated';
END
$$;
