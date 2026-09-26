-- Recipients reporting a note somebody shared with them.
--
-- A received note can hold anything its author wrote. The reader could already
-- take it out of their list (dismiss); they can now tell the team, with a
-- reason, and the console can take the note off every share. Kept apart from
-- moderation_events on purpose: those rows are attached to the author and
-- count towards the flags that restrict an account, and a report is somebody's
-- claim, not a verdict.


-- CreateEnum
CREATE TYPE "NoteReportReason" AS ENUM ('HATE', 'SEXUAL', 'SPAM', 'PERSONAL_DATA', 'OTHER');

-- CreateEnum
CREATE TYPE "NoteReportStatus" AS ENUM ('OPEN', 'UNSHARED', 'DISMISSED');

-- CreateTable
CREATE TABLE "note_reports" (
    "id" UUID NOT NULL,
    "noteId" UUID NOT NULL,
    "reporterId" UUID,
    "reason" "NoteReportReason" NOT NULL,
    "comment" VARCHAR(500),
    "status" "NoteReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "note_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "note_reports_status_idx" ON "note_reports"("status");

-- CreateIndex
CREATE INDEX "note_reports_noteId_idx" ON "note_reports"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "note_reports_reporterId_noteId_key" ON "note_reports"("reporterId", "noteId");

-- AddForeignKey
ALTER TABLE "note_reports" ADD CONSTRAINT "note_reports_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_reports" ADD CONSTRAINT "note_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- One report per reporter and note: reporting again updates the row. A null
-- reporterId (an erased account) does not collide, which is what keeps those
-- reports.

-- ─── Row level security ──────────────────────────────────────────────────────
-- A reporter reads their own reports, and nobody else's: the comment is written
-- for the team, and who reported a note is not the author's to know. Nothing
-- grants an insert, an update or a delete. A report is written by the server,
-- which checks the reporter really received the note.
ALTER TABLE "note_reports" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "note_reports_select_own" ON public.note_reports;
CREATE POLICY "note_reports_select_own" ON public.note_reports FOR SELECT
  USING (public.current_user_role() = 'ADMIN' OR "reporterId" = auth.uid());

-- Column privileges, as for the other tables the clients read
-- (20260725000000_rls_column_hardening): read only, whatever the defaults grant.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE 'REVOKE ALL ON public.note_reports FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.note_reports TO authenticated';
END
$$;
