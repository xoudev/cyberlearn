-- Streak feature: record + freeze tokens on users, and a per-day activity log.

-- AlterTable: streak record + freeze reserve on users.
-- longestStreak is seeded from the current streak below so the record is never
-- lower than the live streak. streakFreezes defaults to 1, which also grants one
-- freeze to every existing user (Postgres applies the default to existing rows).
ALTER TABLE "users" ADD COLUMN "longestStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "streakFreezes" INTEGER NOT NULL DEFAULT 1;
UPDATE "users" SET "longestStreak" = "streakDays" WHERE "streakDays" > "longestStreak";

-- CreateTable: one row per (user, calendar day) with at least one activity.
CREATE TABLE "user_activity_days" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activity_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_activity_days_userId_day_key" ON "user_activity_days"("userId", "day");

-- AddForeignKey
ALTER TABLE "user_activity_days" ADD CONSTRAINT "user_activity_days_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── RLS (same migration as the table, per project convention) ───────────────
-- The activity log is written server-side only (Prisma / service_role, which
-- bypasses RLS). Clients may read only their own rows; no client writes.
ALTER TABLE public.user_activity_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_self_select" ON public.user_activity_days;
CREATE POLICY "activity_self_select" ON public.user_activity_days FOR SELECT
  USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "activity_admin_all" ON public.user_activity_days;
CREATE POLICY "activity_admin_all" ON public.user_activity_days FOR ALL
  USING (public.current_user_role() = 'ADMIN');
