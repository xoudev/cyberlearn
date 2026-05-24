-- =============================================================================
-- post_prisma_rls.sql
-- Run this AFTER every `prisma migrate deploy` to (re)apply RLS policies.
-- The script is idempotent: DROP POLICY IF EXISTS before CREATE POLICY.
-- =============================================================================

-- ─── Enable RLS on all tables ────────────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.path_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_badge_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_path_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_placement_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skip_waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletion_tokens ENABLE ROW LEVEL SECURITY;

-- ─── Helper: read the user role from the JWT ─────────────────────────────────
-- Called in policies instead of querying public.users every time.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'user_role')::text;
$$;

-- ─── USERS ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "users_select_public" ON public.users;
CREATE POLICY "users_select_public" ON public.users FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "users_insert_self" ON public.users;
CREATE POLICY "users_insert_self" ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_self" ON public.users;
CREATE POLICY "users_update_self" ON public.users FOR UPDATE
  -- Prevent role escalation: a user cannot change their own role
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "users_admin_all" ON public.users;
CREATE POLICY "users_admin_all" ON public.users FOR ALL
  USING (public.current_user_role() = 'ADMIN');

-- ─── USER_PREFERENCES ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "prefs_self_all" ON public.user_preferences;
CREATE POLICY "prefs_self_all" ON public.user_preferences FOR ALL
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

DROP POLICY IF EXISTS "prefs_admin_all" ON public.user_preferences;
CREATE POLICY "prefs_admin_all" ON public.user_preferences FOR ALL
  USING (public.current_user_role() = 'ADMIN');

-- ─── LESSONS ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "lessons_select_published" ON public.lessons;
CREATE POLICY "lessons_select_published" ON public.lessons FOR SELECT
  USING (status = 'PUBLISHED' OR public.current_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "lessons_admin_all" ON public.lessons;
CREATE POLICY "lessons_admin_all" ON public.lessons FOR ALL
  USING (public.current_user_role() = 'ADMIN');

-- ─── LESSON_PREREQUISITES ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "lesson_prereqs_select" ON public.lesson_prerequisites;
CREATE POLICY "lesson_prereqs_select" ON public.lesson_prerequisites FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "lesson_prereqs_admin_all" ON public.lesson_prerequisites;
CREATE POLICY "lesson_prereqs_admin_all" ON public.lesson_prerequisites FOR ALL
  USING (public.current_user_role() = 'ADMIN');

-- ─── PATHS ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "paths_select_published" ON public.paths;
CREATE POLICY "paths_select_published" ON public.paths FOR SELECT
  USING (status = 'PUBLISHED' OR public.current_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "paths_admin_all" ON public.paths;
CREATE POLICY "paths_admin_all" ON public.paths FOR ALL
  USING (public.current_user_role() = 'ADMIN');

-- ─── PATH_LESSONS ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "path_lessons_select" ON public.path_lessons;
CREATE POLICY "path_lessons_select" ON public.path_lessons FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "path_lessons_admin_all" ON public.path_lessons;
CREATE POLICY "path_lessons_admin_all" ON public.path_lessons FOR ALL
  USING (public.current_user_role() = 'ADMIN');

-- ─── BADGES ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "badges_select_active" ON public.badges;
CREATE POLICY "badges_select_active" ON public.badges FOR SELECT
  USING ("isActive" = true OR public.current_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "badges_admin_all" ON public.badges;
CREATE POLICY "badges_admin_all" ON public.badges FOR ALL
  USING (public.current_user_role() = 'ADMIN');

-- ─── LESSON_BADGE_REWARDS ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "badge_rewards_select" ON public.lesson_badge_rewards;
CREATE POLICY "badge_rewards_select" ON public.lesson_badge_rewards FOR SELECT
  USING (true);

-- ─── USER_BADGES ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "user_badges_self_select" ON public.user_badges;
CREATE POLICY "user_badges_self_select" ON public.user_badges FOR SELECT
  USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "user_badges_admin_all" ON public.user_badges;
CREATE POLICY "user_badges_admin_all" ON public.user_badges FOR ALL
  USING (public.current_user_role() = 'ADMIN');

-- ─── USER_LESSON_PROGRESS ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "progress_self_select" ON public.user_lesson_progress;
CREATE POLICY "progress_self_select" ON public.user_lesson_progress FOR SELECT
  USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "progress_self_insert" ON public.user_lesson_progress;
CREATE POLICY "progress_self_insert" ON public.user_lesson_progress FOR INSERT
  WITH CHECK (auth.uid() = "userId");

DROP POLICY IF EXISTS "progress_self_update" ON public.user_lesson_progress;
CREATE POLICY "progress_self_update" ON public.user_lesson_progress FOR UPDATE
  USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "progress_admin_all" ON public.user_lesson_progress;
CREATE POLICY "progress_admin_all" ON public.user_lesson_progress FOR ALL
  USING (public.current_user_role() = 'ADMIN');

-- ─── USER_PATH_PROGRESS ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "path_progress_self_all" ON public.user_path_progress;
CREATE POLICY "path_progress_self_all" ON public.user_path_progress FOR ALL
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

DROP POLICY IF EXISTS "path_progress_admin_all" ON public.user_path_progress;
CREATE POLICY "path_progress_admin_all" ON public.user_path_progress FOR ALL
  USING (public.current_user_role() = 'ADMIN');

-- ─── CERTIFICATES ────────────────────────────────────────────────────────────
-- Public SELECT to allow /verify/[publicId] without authentication

DROP POLICY IF EXISTS "certificates_select_public" ON public.certificates;
CREATE POLICY "certificates_select_public" ON public.certificates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "certificates_admin_write" ON public.certificates;
CREATE POLICY "certificates_admin_write" ON public.certificates FOR INSERT
  WITH CHECK (public.current_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "certificates_admin_update" ON public.certificates;
CREATE POLICY "certificates_admin_update" ON public.certificates FOR UPDATE
  USING (public.current_user_role() = 'ADMIN');

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "notifications_self_all" ON public.notifications;
CREATE POLICY "notifications_self_all" ON public.notifications FOR ALL
  USING (auth.uid() = "userId");

-- ─── REVIEW_SCHEDULES ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "review_self_all" ON public.review_schedules;
CREATE POLICY "review_self_all" ON public.review_schedules FOR ALL
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

-- ─── RATINGS ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "ratings_select_all" ON public.ratings;
CREATE POLICY "ratings_select_all" ON public.ratings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "ratings_self_write" ON public.ratings;
CREATE POLICY "ratings_self_write" ON public.ratings FOR INSERT
  WITH CHECK (auth.uid() = "userId");

DROP POLICY IF EXISTS "ratings_self_update" ON public.ratings;
CREATE POLICY "ratings_self_update" ON public.ratings FOR UPDATE
  USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "ratings_admin_all" ON public.ratings;
CREATE POLICY "ratings_admin_all" ON public.ratings FOR ALL
  USING (public.current_user_role() = 'ADMIN');

-- ─── LESSON_QUESTIONS ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "questions_select_visible" ON public.lesson_questions;
CREATE POLICY "questions_select_visible" ON public.lesson_questions FOR SELECT
  USING ("isHidden" = false OR auth.uid() = "userId" OR public.current_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "questions_self_insert" ON public.lesson_questions;
CREATE POLICY "questions_self_insert" ON public.lesson_questions FOR INSERT
  WITH CHECK (auth.uid() = "userId");

DROP POLICY IF EXISTS "questions_self_update" ON public.lesson_questions;
CREATE POLICY "questions_self_update" ON public.lesson_questions FOR UPDATE
  USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "questions_admin_all" ON public.lesson_questions;
CREATE POLICY "questions_admin_all" ON public.lesson_questions FOR ALL
  USING (public.current_user_role() = 'ADMIN');

-- ─── LESSON_ANSWERS ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "answers_select_visible" ON public.lesson_answers;
CREATE POLICY "answers_select_visible" ON public.lesson_answers FOR SELECT
  USING ("isHidden" = false OR auth.uid() = "userId" OR public.current_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "answers_self_insert" ON public.lesson_answers;
CREATE POLICY "answers_self_insert" ON public.lesson_answers FOR INSERT
  WITH CHECK (auth.uid() = "userId");

DROP POLICY IF EXISTS "answers_self_update" ON public.lesson_answers;
CREATE POLICY "answers_self_update" ON public.lesson_answers FOR UPDATE
  USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "answers_admin_all" ON public.lesson_answers;
CREATE POLICY "answers_admin_all" ON public.lesson_answers FOR ALL
  USING (public.current_user_role() = 'ADMIN');

-- ─── CONTACT_TICKETS ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "tickets_insert_public" ON public.contact_tickets;
CREATE POLICY "tickets_insert_public" ON public.contact_tickets FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "tickets_self_select" ON public.contact_tickets;
CREATE POLICY "tickets_self_select" ON public.contact_tickets FOR SELECT
  USING (auth.uid() = "userId" OR public.current_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "tickets_admin_all" ON public.contact_tickets;
CREATE POLICY "tickets_admin_all" ON public.contact_tickets FOR ALL
  USING (public.current_user_role() = 'ADMIN');

-- ─── AUDIT_LOGS ──────────────────────────────────────────────────────────────
-- Write via service role only (backend), read admin only

DROP POLICY IF EXISTS "audit_admin_select" ON public.audit_logs;
CREATE POLICY "audit_admin_select" ON public.audit_logs FOR SELECT
  USING (public.current_user_role() = 'ADMIN');

-- ─── PLACEMENT_QUESTIONS ─────────────────────────────────────────────────────
-- Public SELECT but correctOptionId is hidden via a view in Phase 4+
-- For now, authenticated users can read questions (correctOptionId is filtered
-- server-side by never selecting it in queries from the app)

DROP POLICY IF EXISTS "placement_q_select_auth" ON public.placement_questions;
CREATE POLICY "placement_q_select_auth" ON public.placement_questions FOR SELECT
  USING ("isActive" = true OR public.current_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "placement_q_admin_all" ON public.placement_questions;
CREATE POLICY "placement_q_admin_all" ON public.placement_questions FOR ALL
  USING (public.current_user_role() = 'ADMIN');

-- ─── USER_PLACEMENT_RESULTS ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "placement_result_self" ON public.user_placement_results;
CREATE POLICY "placement_result_self" ON public.user_placement_results FOR ALL
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

DROP POLICY IF EXISTS "placement_result_admin" ON public.user_placement_results;
CREATE POLICY "placement_result_admin" ON public.user_placement_results FOR ALL
  USING (public.current_user_role() = 'ADMIN');

-- ─── USER_SKIP_WAIVERS ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "skip_waivers_self" ON public.user_skip_waivers;
CREATE POLICY "skip_waivers_self" ON public.user_skip_waivers FOR ALL
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

DROP POLICY IF EXISTS "skip_waivers_admin" ON public.user_skip_waivers;
CREATE POLICY "skip_waivers_admin" ON public.user_skip_waivers FOR ALL
  USING (public.current_user_role() = 'ADMIN');

-- ─── ACCOUNT_DELETION_TOKENS ─────────────────────────────────────────────────
-- Users may only SELECT their own tokens (read-only: confirms a pending request exists).
-- INSERT/UPDATE/DELETE are reserved for service_role (Prisma), which bypasses RLS.
-- Allowing writes via the anon key would let a user pre-insert a crafted tokenHash,
-- bypassing the email-confirmation gate entirely.
-- Admins can read all tokens (support / audit trail).

DROP POLICY IF EXISTS "deletion_tokens_own" ON public.account_deletion_tokens;
CREATE POLICY "deletion_tokens_own" ON public.account_deletion_tokens FOR SELECT
  USING (auth.uid() = "userId");

DROP POLICY IF EXISTS "deletion_tokens_admin_select" ON public.account_deletion_tokens;
CREATE POLICY "deletion_tokens_admin_select" ON public.account_deletion_tokens FOR SELECT
  USING (public.current_user_role() = 'ADMIN');
