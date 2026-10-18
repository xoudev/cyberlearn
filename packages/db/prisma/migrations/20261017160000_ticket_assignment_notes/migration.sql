-- Tickets in the console: who has one in hand, and what the team notes on it.
--
-- An administrator takes a ticket (contact_tickets."assigneeId"), and the team
-- leaves itself notes on it (ticket_notes). Neither is ever shown to the
-- requester: the site's and the app's reads of a ticket select their columns
-- one by one and name neither, and no client role can reach either table.

-- AlterTable
ALTER TABLE "contact_tickets" ADD COLUMN     "assigneeId" UUID;

-- CreateTable
CREATE TABLE "ticket_notes" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "authorId" UUID,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ticket_notes_ticketId_createdAt_idx" ON "ticket_notes"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "contact_tickets_assigneeId_idx" ON "contact_tickets"("assigneeId");

-- AddForeignKey
ALTER TABLE "contact_tickets" ADD CONSTRAINT "contact_tickets_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_notes" ADD CONSTRAINT "ticket_notes_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "contact_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_notes" ADD CONSTRAINT "ticket_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─── Row level security ──────────────────────────────────────────────────────
-- contact_tickets needs nothing new: 20260725010000_rls_qa_tickets_hardening
-- revoked every privilege anon and authenticated had on it, so the new column
-- is out of their reach like the rest of the row.
--
-- ticket_notes is the team's alone. Unlike ticket_messages, it does not follow
-- its ticket: the person who opened a ticket reads their thread, never what the
-- team wrote about them. The one policy reads for an administrator, and no
-- client role holds a privilege on the table to use it with: notes are read
-- and written by the console, through Prisma, which connects as the owner.
-- The policy keeps the intent written down should a later migration widen the
-- grants; nothing grants an insert, an update or a delete to anybody.
ALTER TABLE "ticket_notes" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_notes_select_admin" ON public.ticket_notes;
CREATE POLICY "ticket_notes_select_admin" ON public.ticket_notes FOR SELECT
  USING (public.current_user_role() = 'ADMIN');

DO $$
BEGIN
  -- Plain Postgres (some local setups) has no Supabase roles: nothing to revoke.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE 'REVOKE ALL ON public.ticket_notes FROM anon, authenticated';
END
$$;
