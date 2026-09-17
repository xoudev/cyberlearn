-- A ticket becomes a conversation, and a school can ask to be added.

-- A request to add an establishment is the one theme with a shape to it: the
-- name, the town and someone answerable for it. Without those three the request
-- cannot be acted on, and the first reply was always the same three questions.
ALTER TYPE "TicketTheme" ADD VALUE IF NOT EXISTS 'ESTABLISHMENT_REQUEST' BEFORE 'OTHER';

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "authorId" UUID,
    "fromStaff" BOOLEAN NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ticket_messages_ticketId_createdAt_idx" ON "ticket_messages"("ticketId", "createdAt");

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "contact_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─── Row level security ──────────────────────────────────────────────────────
-- The thread follows its ticket: contact_tickets already says a person reads
-- their own and an administrator reads all, so a message is readable exactly
-- when the ticket it hangs off is. Writing goes through the application, which
-- decides whether a reply is the requester's or the team's; nothing here grants
-- an insert, so the Data API cannot be used to forge one either way.
ALTER TABLE "ticket_messages" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_messages_select_own" ON public.ticket_messages FOR SELECT
  USING (
    public.current_user_role() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.contact_tickets t
      WHERE t.id = ticket_messages."ticketId"
        AND t."userId" = auth.uid()
    )
  );
