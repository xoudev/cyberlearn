-- One markdown note per (user, lesson): the in-lesson note drawer writes here and
-- the notes library lists them grouped by parcours. A user fully owns their notes.

-- CreateTable
CREATE TABLE "notes" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notes_userId_lessonId_key" ON "notes"("userId", "lessonId");
CREATE INDEX "notes_userId_idx" ON "notes"("userId");

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notes" ADD CONSTRAINT "notes_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── RLS (same migration as the table, per project convention) ───────────────
-- A user fully owns their notes: they read and write only their own rows. The
-- app writes via server actions (service_role, RLS-exempt); these policies are
-- defense-in-depth for any direct client access.
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_self_select" ON public.notes;
CREATE POLICY "notes_self_select" ON public.notes FOR SELECT
  USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "notes_self_insert" ON public.notes;
CREATE POLICY "notes_self_insert" ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = "userId");

DROP POLICY IF EXISTS "notes_self_update" ON public.notes;
CREATE POLICY "notes_self_update" ON public.notes FOR UPDATE
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

DROP POLICY IF EXISTS "notes_self_delete" ON public.notes;
CREATE POLICY "notes_self_delete" ON public.notes FOR DELETE
  USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "notes_admin_all" ON public.notes;
CREATE POLICY "notes_admin_all" ON public.notes FOR ALL
  USING (public.current_user_role() = 'ADMIN');
