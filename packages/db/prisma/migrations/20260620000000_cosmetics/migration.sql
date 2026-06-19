-- Cosmetics: catalog (Cosmetic) + per-user unlocks (UserCosmetic) + equipped
-- loadout (UserCosmeticLoadout). Plus two new criterion kinds (LEVEL,
-- BADGE_EARNED) reused by cosmetic unlock conditions (and available to badges).

-- AlterEnum: new criterion kinds. Added before use; not referenced by any value
-- in this migration (PG forbids using a new enum value in the same transaction).
ALTER TYPE "BadgeCriterionType" ADD VALUE IF NOT EXISTS 'LEVEL';
ALTER TYPE "BadgeCriterionType" ADD VALUE IF NOT EXISTS 'BADGE_EARNED';

-- CreateEnum
CREATE TYPE "CosmeticType" AS ENUM ('TERMINAL_THEME', 'HEXAGON_STYLE', 'PROFILE_FRAME', 'ACCENT_COLOR');

-- CreateTable: cosmetic catalog
CREATE TABLE "cosmetics" (
    "id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "type" "CosmeticType" NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "description" VARCHAR(280),
    "rarity" "BadgeRarity" NOT NULL DEFAULT 'COMMON',
    "criterionType" "BadgeCriterionType" NOT NULL,
    "criterionData" JSONB NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cosmetics_pkey" PRIMARY KEY ("id")
);

-- CreateTable: per-user unlocks
CREATE TABLE "user_cosmetics" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "cosmeticId" UUID NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_cosmetics_pkey" PRIMARY KEY ("id")
);

-- CreateTable: equipped loadout (one row per user)
CREATE TABLE "user_cosmetic_loadouts" (
    "userId" UUID NOT NULL,
    "terminalTheme" VARCHAR(40),
    "hexagonStyle" VARCHAR(40),
    "profileFrame" VARCHAR(40),
    "accentColor" VARCHAR(40),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_cosmetic_loadouts_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "cosmetics_code_key" ON "cosmetics"("code");
CREATE INDEX "cosmetics_type_isActive_idx" ON "cosmetics"("type", "isActive");
CREATE UNIQUE INDEX "user_cosmetics_userId_cosmeticId_key" ON "user_cosmetics"("userId", "cosmeticId");
CREATE INDEX "user_cosmetics_userId_idx" ON "user_cosmetics"("userId");

-- AddForeignKey
ALTER TABLE "user_cosmetics" ADD CONSTRAINT "user_cosmetics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_cosmetics" ADD CONSTRAINT "user_cosmetics_cosmeticId_fkey" FOREIGN KEY ("cosmeticId") REFERENCES "cosmetics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_cosmetic_loadouts" ADD CONSTRAINT "user_cosmetic_loadouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── RLS (same migration as the tables, per project convention) ──────────────
-- cosmetics: catalog readable by anyone (active rows) or admin; writes admin-only.
ALTER TABLE public.cosmetics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cosmetics_select_active" ON public.cosmetics;
CREATE POLICY "cosmetics_select_active" ON public.cosmetics FOR SELECT
  USING ("isActive" = true OR public.current_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "cosmetics_admin_all" ON public.cosmetics;
CREATE POLICY "cosmetics_admin_all" ON public.cosmetics FOR ALL
  USING (public.current_user_role() = 'ADMIN');

-- user_cosmetics: unlocks are written server-side only (service_role bypasses
-- RLS). Clients read only their own unlocks; no client writes (infalsifiable).
ALTER TABLE public.user_cosmetics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_cosmetics_self_select" ON public.user_cosmetics;
CREATE POLICY "user_cosmetics_self_select" ON public.user_cosmetics FOR SELECT
  USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "user_cosmetics_admin_all" ON public.user_cosmetics;
CREATE POLICY "user_cosmetics_admin_all" ON public.user_cosmetics FOR ALL
  USING (public.current_user_role() = 'ADMIN');

-- user_cosmetic_loadouts: the equipped selection, written server-side only after
-- an ownership check. Clients read only their own row; no client writes.
ALTER TABLE public.user_cosmetic_loadouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cosmetic_loadout_self_select" ON public.user_cosmetic_loadouts;
CREATE POLICY "cosmetic_loadout_self_select" ON public.user_cosmetic_loadouts FOR SELECT
  USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "cosmetic_loadout_admin_all" ON public.user_cosmetic_loadouts;
CREATE POLICY "cosmetic_loadout_admin_all" ON public.user_cosmetic_loadouts FOR ALL
  USING (public.current_user_role() = 'ADMIN');
