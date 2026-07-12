-- User-owned folders for organizing notes. A note points at most to one folder
-- (single-membership); deleting a folder ungroups its notes (SET NULL) instead
-- of deleting them. A user fully owns their folders.

-- CreateTable
CREATE TABLE "note_folders" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "note_folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "note_folders_userId_idx" ON "note_folders"("userId");

-- AddForeignKey
ALTER TABLE "note_folders" ADD CONSTRAINT "note_folders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: link notes to an optional folder
ALTER TABLE "notes" ADD COLUMN "folderId" UUID;

-- CreateIndex
CREATE INDEX "notes_folderId_idx" ON "notes"("folderId");

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "note_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── RLS (same migration as the table, per project convention) ───────────────
-- A user fully owns their folders: they read and write only their own rows. The
-- app writes via server actions (service_role, RLS-exempt); these policies are
-- defense-in-depth for any direct client access.
ALTER TABLE public.note_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "note_folders_self_select" ON public.note_folders;
CREATE POLICY "note_folders_self_select" ON public.note_folders FOR SELECT
  USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "note_folders_self_insert" ON public.note_folders;
CREATE POLICY "note_folders_self_insert" ON public.note_folders FOR INSERT
  WITH CHECK (auth.uid() = "userId");

DROP POLICY IF EXISTS "note_folders_self_update" ON public.note_folders;
CREATE POLICY "note_folders_self_update" ON public.note_folders FOR UPDATE
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

DROP POLICY IF EXISTS "note_folders_self_delete" ON public.note_folders;
CREATE POLICY "note_folders_self_delete" ON public.note_folders FOR DELETE
  USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "note_folders_admin_all" ON public.note_folders;
CREATE POLICY "note_folders_admin_all" ON public.note_folders FOR ALL
  USING (public.current_user_role() = 'ADMIN');
