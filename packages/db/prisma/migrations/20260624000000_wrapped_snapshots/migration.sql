-- Curated, shareable recap snapshots. One row per user + period; payload holds
-- ONLY curated stats (no raw/private data). Server-written only.

-- CreateEnum
CREATE TYPE "WrappedPeriod" AS ENUM ('MONTH', 'SEASON');

-- CreateTable
CREATE TABLE "wrapped_snapshots" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "period" "WrappedPeriod" NOT NULL DEFAULT 'MONTH',
    "periodKey" VARCHAR(16) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wrapped_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wrapped_snapshots_userId_period_periodKey_key" ON "wrapped_snapshots"("userId", "period", "periodKey");
CREATE INDEX "wrapped_snapshots_userId_idx" ON "wrapped_snapshots"("userId");

-- AddForeignKey
ALTER TABLE "wrapped_snapshots" ADD CONSTRAINT "wrapped_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── RLS (same migration as the table, per project convention) ───────────────
-- Own snapshots readable; written server-side only (the recap service via
-- service_role). A public share link is handled separately (a later migration).
ALTER TABLE public.wrapped_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wrapped_snapshot_self_select" ON public.wrapped_snapshots;
CREATE POLICY "wrapped_snapshot_self_select" ON public.wrapped_snapshots FOR SELECT
  USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "wrapped_snapshot_admin_all" ON public.wrapped_snapshots;
CREATE POLICY "wrapped_snapshot_admin_all" ON public.wrapped_snapshots FOR ALL
  USING (public.current_user_role() = 'ADMIN');
