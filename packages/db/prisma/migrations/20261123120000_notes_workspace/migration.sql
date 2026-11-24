-- The notes workspace: notes without a lesson, a title of their own, folders
-- inside folders, a trash, pinned notes and flashcards taken from a note.
--
-- A note's lesson becomes optional. Deleting a lesson now frees its notes
-- (SET NULL) instead of deleting them: a note is the learner's work, not the
-- lesson's. The one-note-per-lesson rule stays (Postgres lets NULLs repeat in
-- a unique index, so free notes are not bound by it).

-- DropForeignKey
ALTER TABLE "notes" DROP CONSTRAINT IF EXISTS "notes_lessonId_fkey";

-- AlterTable
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "title" VARCHAR(120) NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "trashedLessonId" UUID,
ALTER COLUMN "lessonId" DROP NOT NULL;

-- Every existing note was a lesson note: its title is its lesson's.
UPDATE "notes" n
SET "title" = left(l."title", 120)
FROM "lessons" l
WHERE l."id" = n."lessonId" AND n."title" = '';

-- AlterTable
ALTER TABLE "note_folders" ADD COLUMN IF NOT EXISTS "parentId" UUID;

-- CreateTable
CREATE TABLE IF NOT EXISTS "note_cards" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "noteId" UUID NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "front" VARCHAR(500) NOT NULL,
    "back" VARCHAR(2000) NOT NULL,
    "box" SMALLINT NOT NULL DEFAULT 1,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "lapses" SMALLINT NOT NULL DEFAULT 0,
    "lastAnsweredAt" TIMESTAMP(3),
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "note_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "note_cards_userId_dueAt_idx" ON "note_cards"("userId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "note_cards_noteId_key_key" ON "note_cards"("noteId", "key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notes_deletedAt_idx" ON "notes"("deletedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "note_folders_parentId_idx" ON "note_folders"("parentId");

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_cards" DROP CONSTRAINT IF EXISTS "note_cards_userId_fkey";
ALTER TABLE "note_cards" ADD CONSTRAINT "note_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_cards" DROP CONSTRAINT IF EXISTS "note_cards_noteId_fkey";
ALTER TABLE "note_cards" ADD CONSTRAINT "note_cards_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_folders" DROP CONSTRAINT IF EXISTS "note_folders_parentId_fkey";
ALTER TABLE "note_folders" ADD CONSTRAINT "note_folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "note_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── RLS (same migration as the table, per project convention) ───────────────
-- The site reads and writes through Prisma (table owner, RLS-exempt); these
-- policies are what the Data API (the app) gets.
--
-- notes: a note in the trash is out of reach over the Data API. The app has no
-- trash yet, and would otherwise list and edit notes the learner threw away.
-- A note can only be filed in one of its owner's own folders: the old policy
-- let a client point folderId at anybody's folder.
DROP POLICY IF EXISTS "notes_self_select" ON public.notes;
CREATE POLICY "notes_self_select" ON public.notes FOR SELECT
  USING (auth.uid() = "userId" AND "deletedAt" IS NULL);

DROP POLICY IF EXISTS "notes_self_insert" ON public.notes;
CREATE POLICY "notes_self_insert" ON public.notes FOR INSERT
  WITH CHECK (
    auth.uid() = "userId"
    AND "deletedAt" IS NULL
    AND (
      "folderId" IS NULL
      OR EXISTS (
        SELECT 1 FROM public.note_folders f
        WHERE f.id = notes."folderId" AND f."userId" = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "notes_self_update" ON public.notes;
CREATE POLICY "notes_self_update" ON public.notes FOR UPDATE
  USING (auth.uid() = "userId" AND "deletedAt" IS NULL)
  WITH CHECK (
    auth.uid() = "userId"
    AND (
      "folderId" IS NULL
      OR EXISTS (
        SELECT 1 FROM public.note_folders f
        WHERE f.id = notes."folderId" AND f."userId" = auth.uid()
      )
    )
  );

-- note_folders: same rule for a folder's parent.
DROP POLICY IF EXISTS "note_folders_self_insert" ON public.note_folders;
CREATE POLICY "note_folders_self_insert" ON public.note_folders FOR INSERT
  WITH CHECK (
    auth.uid() = "userId"
    AND (
      "parentId" IS NULL
      OR EXISTS (
        SELECT 1 FROM public.note_folders p
        WHERE p.id = note_folders."parentId" AND p."userId" = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "note_folders_self_update" ON public.note_folders;
CREATE POLICY "note_folders_self_update" ON public.note_folders FOR UPDATE
  USING (auth.uid() = "userId")
  WITH CHECK (
    auth.uid() = "userId"
    AND (
      "parentId" IS NULL
      OR EXISTS (
        SELECT 1 FROM public.note_folders p
        WHERE p.id = note_folders."parentId" AND p."userId" = auth.uid()
      )
    )
  );

-- note_cards: the learner's own deck, on their own notes.
ALTER TABLE public.note_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "note_cards_self_select" ON public.note_cards;
CREATE POLICY "note_cards_self_select" ON public.note_cards FOR SELECT
  USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "note_cards_self_insert" ON public.note_cards;
CREATE POLICY "note_cards_self_insert" ON public.note_cards FOR INSERT
  WITH CHECK (
    auth.uid() = "userId"
    AND EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = note_cards."noteId" AND n."userId" = auth.uid()
    )
  );

DROP POLICY IF EXISTS "note_cards_self_update" ON public.note_cards;
CREATE POLICY "note_cards_self_update" ON public.note_cards FOR UPDATE
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

DROP POLICY IF EXISTS "note_cards_self_delete" ON public.note_cards;
CREATE POLICY "note_cards_self_delete" ON public.note_cards FOR DELETE
  USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "note_cards_admin_all" ON public.note_cards;
CREATE POLICY "note_cards_admin_all" ON public.note_cards FOR ALL
  USING (public.current_user_role() = 'ADMIN');
