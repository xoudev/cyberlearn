-- CTF tournaments between classes, or between the schools they belong to:
-- challenges of the catalogue, open over a window, each worth its points to a
-- team the first time one of its members finds the flag, with a scoreboard
-- read again every few seconds while it runs. Composed in the console.
--
-- A challenge that served in a tournament cannot be deleted (RESTRICT on both
-- references): the scores rest on it. An erased account leaves its solves
-- behind, without the person (SET NULL): the team keeps its points.

-- CreateEnum
CREATE TYPE "TournamentTeamScope" AS ENUM ('CLASS', 'ESTABLISHMENT');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TOURNAMENT_ANNOUNCED';

-- CreateTable
CREATE TABLE "tournaments" (
    "id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000) NOT NULL DEFAULT '',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "teamScope" "TournamentTeamScope" NOT NULL DEFAULT 'CLASS',
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_classes" (
    "tournamentId" UUID NOT NULL,
    "classId" UUID NOT NULL,

    CONSTRAINT "tournament_classes_pkey" PRIMARY KEY ("tournamentId","classId")
);

-- CreateTable
CREATE TABLE "tournament_challenges" (
    "tournamentId" UUID NOT NULL,
    "challengeId" UUID NOT NULL,
    "points" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tournament_challenges_pkey" PRIMARY KEY ("tournamentId","challengeId")
);

-- CreateTable
CREATE TABLE "tournament_solves" (
    "id" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "challengeId" UUID NOT NULL,
    "userId" UUID,
    "classId" UUID NOT NULL,
    "points" INTEGER NOT NULL,
    "solvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_solves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tournaments_startsAt_idx" ON "tournaments"("startsAt");

-- CreateIndex
CREATE INDEX "tournament_classes_classId_idx" ON "tournament_classes"("classId");

-- CreateIndex
CREATE INDEX "tournament_challenges_challengeId_idx" ON "tournament_challenges"("challengeId");

-- CreateIndex
CREATE INDEX "tournament_solves_tournamentId_solvedAt_idx" ON "tournament_solves"("tournamentId", "solvedAt");

-- CreateIndex
CREATE INDEX "tournament_solves_userId_idx" ON "tournament_solves"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_solves_tournamentId_challengeId_userId_key" ON "tournament_solves"("tournamentId", "challengeId", "userId");

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_classes" ADD CONSTRAINT "tournament_classes_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_classes" ADD CONSTRAINT "tournament_classes_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_challenges" ADD CONSTRAINT "tournament_challenges_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_challenges" ADD CONSTRAINT "tournament_challenges_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_solves" ADD CONSTRAINT "tournament_solves_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_solves" ADD CONSTRAINT "tournament_solves_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_solves" ADD CONSTRAINT "tournament_solves_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_solves" ADD CONSTRAINT "tournament_solves_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Row level security ──────────────────────────────────────────────────────
-- A tournament is read by the people it brings together: the members of the
-- classes taking part, the teachers who follow them, an admin. Its challenges
-- only once it has started, the way the site hides them until then. A solve is
-- read by whoever found the flag: the scoreboard is built on the server, which
-- names a player only as their leaderboard preference allows. Nothing grants
-- an insert, an update or a delete: the console composes a tournament, and the
-- server records a flag after checking it.
--
-- SECURITY DEFINER for the reason is_class_member() is: a policy on
-- tournament_classes that asked whether the caller is in one of this
-- tournament's classes would query tournament_classes, and evaluate itself
-- again. search_path is pinned, every name inside is schema-qualified.
CREATE OR REPLACE FUNCTION public.can_see_tournament(target_tournament uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tournament_classes tc
    WHERE tc."tournamentId" = target_tournament
      AND (public.is_class_member(tc."classId") OR public.is_class_teacher(tc."classId"))
  );
$$;

-- Revoked from PUBLIC, then handed back to authenticated: without the grant, a
-- policy calling it raises "permission denied for function" instead of
-- returning no rows.
REVOKE ALL ON FUNCTION public.can_see_tournament(uuid) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.can_see_tournament(uuid) TO authenticated';
  END IF;
END $$;

ALTER TABLE "tournaments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tournament_classes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tournament_challenges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tournament_solves" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournaments_select_participants" ON public.tournaments;
CREATE POLICY "tournaments_select_participants" ON public.tournaments FOR SELECT
  USING (public.current_user_role() = 'ADMIN' OR public.can_see_tournament(id));

DROP POLICY IF EXISTS "tournament_classes_select_participants" ON public.tournament_classes;
CREATE POLICY "tournament_classes_select_participants" ON public.tournament_classes FOR SELECT
  USING (
    public.current_user_role() = 'ADMIN'
    OR public.can_see_tournament("tournamentId")
  );

DROP POLICY IF EXISTS "tournament_challenges_select_started" ON public.tournament_challenges;
CREATE POLICY "tournament_challenges_select_started" ON public.tournament_challenges FOR SELECT
  USING (
    public.current_user_role() = 'ADMIN'
    OR (
      public.can_see_tournament("tournamentId")
      AND EXISTS (
        SELECT 1 FROM public.tournaments t
        WHERE t.id = tournament_challenges."tournamentId" AND t."startsAt" <= now()
      )
    )
  );

DROP POLICY IF EXISTS "tournament_solves_select_own" ON public.tournament_solves;
CREATE POLICY "tournament_solves_select_own" ON public.tournament_solves FOR SELECT
  USING (public.current_user_role() = 'ADMIN' OR "userId" = auth.uid());

-- Column privileges, as for the other tables the clients read
-- (20260725000000_rls_column_hardening): read only, whatever the defaults
-- grant, and not which admin composed a tournament.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE 'REVOKE ALL ON public.tournaments FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ("id", "title", "description", "startsAt", "endsAt", "teamScope", "createdAt", "updatedAt") ON public.tournaments TO authenticated';
  EXECUTE 'REVOKE ALL ON public.tournament_classes FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.tournament_classes TO authenticated';
  EXECUTE 'REVOKE ALL ON public.tournament_challenges FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.tournament_challenges TO authenticated';
  EXECUTE 'REVOKE ALL ON public.tournament_solves FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.tournament_solves TO authenticated';
END
$$;
