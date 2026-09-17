-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NOTE_SHARED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MODERATION_ALERT';

-- CreateTable
CREATE TABLE "note_shares" (
    "noteId" UUID NOT NULL,
    "sharedWithId" UUID NOT NULL,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_shares_pkey" PRIMARY KEY ("noteId","sharedWithId")
);

-- CreateIndex
CREATE INDEX "note_shares_sharedWithId_idx" ON "note_shares"("sharedWithId");

-- AddForeignKey
ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_sharedWithId_fkey" FOREIGN KEY ("sharedWithId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ─── Row level security ──────────────────────────────────────────────────────
-- A share row says one person handed a note to another, so both ends may read
-- it and nobody else: the author to see who has it and take it back, the
-- recipient to know the note is theirs to open. The note itself is still
-- guarded by its own policy.
ALTER TABLE "note_shares" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "note_shares_select_parties" ON public.note_shares FOR SELECT
  USING (
    "sharedWithId" = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = note_shares."noteId" AND n."userId" = auth.uid()
    )
    OR public.current_user_role() = 'ADMIN'
  );
