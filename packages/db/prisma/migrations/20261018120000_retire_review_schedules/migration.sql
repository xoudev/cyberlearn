-- The lesson-level review queue (SM-2) is retired: the review cards replace
-- it on the site and in the app (20261011180000_review_cards), and nothing
-- reads or writes review_schedules any more.
--
-- Its rows are not dropped yet. db:backfill-review-cards turns them into
-- cards, and production may not have run it: the table is renamed
-- review_schedules_legacy, the script's alone, and goes in a later release,
-- once the conversion has run (docs/DEPLOY.md). Its foreign keys stay, so an
-- erased account or a deleted lesson still takes its rows with it.
--
-- The app builds installed before the cards read the queue themselves,
-- through the Data API: review_schedules, with the lesson embedded
-- (lesson:lessons(...)). A missing table would be an error screen in them.
-- review_schedules becomes an empty view, which they read as a queue with
-- nothing due. The view takes and drops the writes of the site's previous
-- deployment too, still serving while this migration lands (see its trigger).

-- ─── The table, under its new name ──────────────────────────────────────────
-- The constraints and indexes follow it, under the names Prisma gives a table
-- called review_schedules_legacy, so the schema and the database still agree.
ALTER TABLE "review_schedules" RENAME TO "review_schedules_legacy";
ALTER TABLE "review_schedules_legacy" RENAME CONSTRAINT "review_schedules_pkey" TO "review_schedules_legacy_pkey";
ALTER TABLE "review_schedules_legacy" RENAME CONSTRAINT "review_schedules_userId_fkey" TO "review_schedules_legacy_userId_fkey";
ALTER TABLE "review_schedules_legacy" RENAME CONSTRAINT "review_schedules_lessonId_fkey" TO "review_schedules_legacy_lessonId_fkey";
ALTER INDEX "review_schedules_userId_lessonId_key" RENAME TO "review_schedules_legacy_userId_lessonId_key";
ALTER INDEX "review_schedules_nextReviewAt_idx" RENAME TO "review_schedules_legacy_nextReviewAt_idx";

-- ─── Row level security: the server's alone ─────────────────────────────────
-- RLS stays on, with no permissive policy left, as on the other tables no
-- client reads (quiz_questions, challenges): a full deny for anon and
-- authenticated. The read of one's own rows
-- (20260924190000_server_written_learning_tables) goes, since no app reads the
-- rows under this name; the restrictive mfa_verified_session every table
-- carries (20260726000000_mfa_session_hardening) stays, and grants nothing on
-- its own. The privileges go too, so that a permissive policy added later
-- would not reopen the table.
ALTER TABLE public.review_schedules_legacy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "review_select_own" ON public.review_schedules_legacy;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE 'REVOKE ALL ON public.review_schedules_legacy FROM anon, authenticated';
END
$$;

-- ─── The old name: an empty view for the installed apps ─────────────────────
-- The columns the queue had, so every select those builds send still parses
-- (id, nextReviewAt, easeFactor, filtered on userId, ordered by nextReviewAt).
-- Built on review_cards, whose lessonId references lessons: PostgREST reads
-- the relation through the view, and the embedded lesson:lessons(...) of those
-- builds still resolves. On review_cards rather than on the legacy table, so
-- that dropping the legacy table later leaves the view alone.
--
-- WHERE false: no row, ever. security_invoker: read with the reader's own
-- rights and review_cards' RLS, never the owner's. Readable by a signed-in
-- reader only, and never writable: SELECT is the only privilege granted, and
-- review_cards grants clients nothing else either.
CREATE VIEW public.review_schedules
WITH (security_invoker = true) AS
SELECT
  c."id",
  c."userId",
  c."lessonId",
  2.5::double precision AS "easeFactor",
  1 AS "intervalDays",
  0 AS "repetitions",
  c."dueAt" AS "nextReviewAt",
  c."createdAt" AS "lastReviewedAt"
FROM public.review_cards c
WHERE false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE 'REVOKE ALL ON public.review_schedules FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.review_schedules TO authenticated';
END
$$;

-- ─── The previous deployment's writes: taken, and dropped ──────────────────
-- The migrations race the Vercel build (.github/workflows/migrate.yml): this
-- one lands in seconds, the code that no longer writes the queue goes live
-- minutes later. Until then the previous deployment upserts a schedule at
-- every first completion of a lesson, and still grades and clears the queue.
-- The view would refuse that insert (easeFactor is a constant here, not a
-- column it can write), and the error would roll the whole completion back:
-- for those minutes, nobody with revisions on could finish a new lesson.
--
-- So every write to the view is taken and dropped, and the old code runs to
-- the end: a completion commits, with the review cards that code enqueues in
-- the same transaction; a grade or a reset finds nothing to change. The row
-- an insert hands back is the one it was given, which is what Prisma asks
-- for. No client gets this far: SELECT is all they hold on the view. The
-- trigger goes with the view.
CREATE OR REPLACE FUNCTION private.review_schedules_drop_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION private.review_schedules_drop_write() FROM PUBLIC;

CREATE TRIGGER review_schedules_drop_write
  INSTEAD OF INSERT OR UPDATE OR DELETE ON public.review_schedules
  FOR EACH ROW EXECUTE FUNCTION private.review_schedules_drop_write();
