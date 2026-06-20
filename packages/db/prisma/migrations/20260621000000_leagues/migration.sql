-- Seasonal leagues: Season (one ACTIVE at a time) + LeagueMembership (a user's
-- division / pod / seasonXp per season). seasonXp / division / pod / rank are
-- written server-side only (creditXp + the season rollover).

-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('ACTIVE', 'CLOSING', 'CLOSED');
CREATE TYPE "LeagueDivision" AS ENUM ('BRONZE', 'ARGENT', 'OR', 'PLATINE', 'DIAMANT');

-- CreateTable
CREATE TABLE "seasons" (
    "id" UUID NOT NULL,
    "index" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "SeasonStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "league_memberships" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "division" "LeagueDivision" NOT NULL DEFAULT 'BRONZE',
    "pod" INTEGER NOT NULL DEFAULT 1,
    "seasonXp" INTEGER NOT NULL DEFAULT 0,
    "finalRank" INTEGER,
    "promoted" BOOLEAN NOT NULL DEFAULT false,
    "relegated" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seasons_index_key" ON "seasons"("index");
CREATE INDEX "seasons_status_idx" ON "seasons"("status");
CREATE UNIQUE INDEX "league_memberships_userId_seasonId_key" ON "league_memberships"("userId", "seasonId");
CREATE INDEX "league_memberships_seasonId_division_pod_seasonXp_idx" ON "league_memberships"("seasonId", "division", "pod", "seasonXp");

-- AddForeignKey
ALTER TABLE "league_memberships" ADD CONSTRAINT "league_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "league_memberships" ADD CONSTRAINT "league_memberships_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── RLS (same migration as the tables, per project convention) ──────────────
-- seasons: readable by anyone; written server-side / admin only.
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seasons_select_all" ON public.seasons;
CREATE POLICY "seasons_select_all" ON public.seasons FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "seasons_admin_all" ON public.seasons;
CREATE POLICY "seasons_admin_all" ON public.seasons FOR ALL
  USING (public.current_user_role() = 'ADMIN');

-- league_memberships: seasonXp / division / pod / rank written server-side only
-- (creditXp + rollover via service_role). Clients read only their own row; the
-- division ladder is served by a repository that applies anonymization.
ALTER TABLE public.league_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "league_membership_self_select" ON public.league_memberships;
CREATE POLICY "league_membership_self_select" ON public.league_memberships FOR SELECT
  USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "league_membership_admin_all" ON public.league_memberships;
CREATE POLICY "league_membership_admin_all" ON public.league_memberships FOR ALL
  USING (public.current_user_role() = 'ADMIN');
