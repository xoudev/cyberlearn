-- Four tables the server writes, and the clients could too.
--
-- The RLS baseline gave each of them a "FOR ALL" policy on the reader's own
-- rows, and no later migration took the write privileges back. Through the
-- Data API, with the public anon key and their own session, a learner could:
--
--   review_schedules      move a review's date back and grade it again, for
--                         a tenth of the lesson's XP each time, or insert a
--                         review for a lesson never studied;
--   user_skip_waivers     waive the prerequisites of any lesson and open
--                         what a path keeps locked;
--   user_placement_results  write their own placement scores;
--   user_path_progress    mark a path started or completed.
--
-- None of them is written by a client: the site and the app go through the
-- server (Prisma), which is where completion, placement and grading are
-- decided. Each table keeps a read of one's own rows (the app shows its
-- revisions and its path progress) and loses everything else.

-- ─── review_schedules ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "review_self_all" ON public.review_schedules;
DROP POLICY IF EXISTS "review_select_own" ON public.review_schedules;
CREATE POLICY "review_select_own" ON public.review_schedules FOR SELECT
  USING (public.current_user_role() = 'ADMIN' OR "userId" = auth.uid());

-- ─── user_skip_waivers ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "skip_waivers_self" ON public.user_skip_waivers;
DROP POLICY IF EXISTS "skip_waivers_select_own" ON public.user_skip_waivers;
CREATE POLICY "skip_waivers_select_own" ON public.user_skip_waivers FOR SELECT
  USING (public.current_user_role() = 'ADMIN' OR "userId" = auth.uid());

-- ─── user_placement_results ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "placement_result_self" ON public.user_placement_results;
DROP POLICY IF EXISTS "placement_result_select_own" ON public.user_placement_results;
CREATE POLICY "placement_result_select_own" ON public.user_placement_results FOR SELECT
  USING (public.current_user_role() = 'ADMIN' OR "userId" = auth.uid());

-- ─── user_path_progress ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "path_progress_self_all" ON public.user_path_progress;
DROP POLICY IF EXISTS "path_progress_select_own" ON public.user_path_progress;
CREATE POLICY "path_progress_select_own" ON public.user_path_progress FOR SELECT
  USING (public.current_user_role() = 'ADMIN' OR "userId" = auth.uid());

-- Column privileges, as for the other tables the clients read
-- (20260725000000_rls_column_hardening): read only, whatever the defaults
-- grant. A policy alone is not enough: without the grant revoked, a future
-- permissive policy would reopen the writes.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE 'REVOKE ALL ON public.review_schedules FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.review_schedules TO authenticated';
  EXECUTE 'REVOKE ALL ON public.user_skip_waivers FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.user_skip_waivers TO authenticated';
  EXECUTE 'REVOKE ALL ON public.user_placement_results FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.user_placement_results TO authenticated';
  EXECUTE 'REVOKE ALL ON public.user_path_progress FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.user_path_progress TO authenticated';
END
$$;
