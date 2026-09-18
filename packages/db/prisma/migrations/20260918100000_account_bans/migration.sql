-- Keeping somebody off the platform, with a reason and an end.

-- An appeal is its own theme. It is the one kind of ticket whose author cannot
-- use the rest of the site while it is open, and a queue where appeals sit
-- among bug reports is a queue where somebody waits a week to be told a
-- mistake was made.
ALTER TYPE "TicketTheme" ADD VALUE IF NOT EXISTS 'BAN_APPEAL' BEFORE 'OTHER';

-- CreateTable
CREATE TABLE "user_bans" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "issuedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liftedAt" TIMESTAMP(3),
    "liftedById" UUID,
    "liftReason" VARCHAR(500),
    "acknowledgedAt" TIMESTAMP(3),
    "appealTicketId" UUID,

    CONSTRAINT "user_bans_pkey" PRIMARY KEY ("id")
);

-- A ban is answered once. A second appeal on the same decision is the same
-- conversation, and it already has a thread.
CREATE UNIQUE INDEX "user_bans_appealTicketId_key" ON "user_bans"("appealTicketId");

-- The question asked on every authenticated request: is this account banned
-- right now. Ordered so the index answers it without reading the table.
CREATE INDEX "user_bans_userId_liftedAt_expiresAt_idx" ON "user_bans"("userId", "liftedAt", "expiresAt");
CREATE INDEX "user_bans_issuedById_idx" ON "user_bans"("issuedById");

-- AddForeignKey
ALTER TABLE "user_bans" ADD CONSTRAINT "user_bans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The record of a decision outlives the administrator who made it.
ALTER TABLE "user_bans" ADD CONSTRAINT "user_bans_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_bans" ADD CONSTRAINT "user_bans_liftedById_fkey" FOREIGN KEY ("liftedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_bans" ADD CONSTRAINT "user_bans_appealTicketId_fkey" FOREIGN KEY ("appealTicketId") REFERENCES "contact_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─── Row level security ──────────────────────────────────────────────────────
-- A person reads the bans that are about them, and nothing else. They have to:
-- the notice, the reason and the end date are all on this row, and a ban
-- somebody cannot read is a ban they cannot answer.
--
-- Nothing here grants an insert, an update or a delete. Issuing, lifting and
-- acknowledging all go through the application, which checks who is asking;
-- the Data API cannot be used to ban somebody, to quietly lift a ban, or to
-- mark one as seen.
ALTER TABLE "user_bans" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_bans_select_own" ON public.user_bans FOR SELECT
  USING (public.current_user_role() = 'ADMIN' OR "userId" = auth.uid());
