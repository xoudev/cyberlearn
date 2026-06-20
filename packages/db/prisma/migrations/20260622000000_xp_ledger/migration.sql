-- Append-only XP ledger: one row per XP credit, written inside creditXp's
-- transaction, so XP can be bucketed by period (month / season). The running
-- User.xpTotal alone cannot express this. Server-written only.

-- CreateEnum
CREATE TYPE "XpSource" AS ENUM ('LESSON', 'BADGE', 'QUEST', 'CHALLENGE', 'REVIEW');

-- CreateTable
CREATE TABLE "xp_ledger" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" "XpSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "xp_ledger_userId_createdAt_idx" ON "xp_ledger"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "xp_ledger" ADD CONSTRAINT "xp_ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── RLS (same migration as the table, per project convention) ───────────────
-- Own rows are readable; the ledger is written server-side only (creditXp via
-- service_role), so there is no client write policy - the history is infalsifiable.
ALTER TABLE public.xp_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "xp_ledger_self_select" ON public.xp_ledger;
CREATE POLICY "xp_ledger_self_select" ON public.xp_ledger FOR SELECT
  USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "xp_ledger_admin_all" ON public.xp_ledger;
CREATE POLICY "xp_ledger_admin_all" ON public.xp_ledger FOR ALL
  USING (public.current_user_role() = 'ADMIN');
