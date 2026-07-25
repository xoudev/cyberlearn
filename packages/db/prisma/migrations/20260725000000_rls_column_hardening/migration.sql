-- Hardens the public Data API (PostgREST) surface.
--
-- Context: anon/authenticated reach these tables directly with the public anon
-- key, which ships inside the web bundle and the Expo app. The baseline
-- policies were written as if the Next.js server were the only client, so
-- several of them are `USING (true)`. A row policy cannot restrict *columns*,
-- so `users` exposed every column - including `email` and `role` - to anyone
-- holding the anon key.
--
-- Fix: column-level privileges decide what may ever leave the database, and the
-- policies are tightened where the client never legitimately writes. Server
-- code connects as the table owner (DATABASE_URL) or as service_role, and is
-- therefore unaffected by these grants.
--
-- The client surface kept here is exactly what apps/mobile uses today
-- (apps/mobile/lib/queries.ts): read own profile + public ranking columns,
-- create own profile row, and track lesson access.

DO $$
BEGIN
  -- Plain Postgres (some local setups) has no Supabase roles: nothing to grant.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;

  -- ─── USERS ─────────────────────────────────────────────────────────────
  -- email, role, bio, lastActiveAt, streakFreezes and timestamps never leave
  -- the database through the Data API again.
  EXECUTE 'REVOKE ALL ON public.users FROM anon, authenticated';
  EXECUTE 'GRANT SELECT (id, username, "displayName", "avatarUrl", "xpTotal", level, "streakDays", "longestStreak") ON public.users TO anon, authenticated';
  -- Signup writes the profile row once (upsert ... ON CONFLICT DO NOTHING).
  -- No UPDATE grant: profile edits go through server actions (Prisma), so the
  -- client can no longer rewrite xpTotal / level / streakDays.
  EXECUTE 'GRANT INSERT (id, email, username, "displayName", "avatarUrl", "updatedAt") ON public.users TO authenticated';

  -- ─── USER_LESSON_PROGRESS ──────────────────────────────────────────────
  -- The client may open a lesson, never award itself a completion: status,
  -- bestScore and completedAt are not writable, which is what made forged
  -- certificates possible.
  EXECUTE 'REVOKE ALL ON public.user_lesson_progress FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.user_lesson_progress TO authenticated';
  EXECUTE 'GRANT INSERT (id, "userId", "lessonId", status, "startedAt", "lastAccessedAt") ON public.user_lesson_progress TO authenticated';
  EXECUTE 'GRANT UPDATE ("lastAccessedAt") ON public.user_lesson_progress TO authenticated';

  -- ─── CERTIFICATES ──────────────────────────────────────────────────────
  -- Public verification (/verify/[publicId]) runs server-side through Prisma,
  -- so the Data API only needs to serve a holder their own certificates.
  EXECUTE 'REVOKE ALL ON public.certificates FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ("publicId", "userId", "pathId", score, "issuedAt", "expiresAt", "revokedAt") ON public.certificates TO authenticated';

  -- ─── RATINGS ───────────────────────────────────────────────────────────
  -- Reviews are rendered server-side; the Data API must not hand out the
  -- author's user id alongside their free-text feedback.
  EXECUTE 'REVOKE ALL ON public.ratings FROM anon, authenticated';
  EXECUTE 'GRANT SELECT (id, "lessonId", "pathId", score, feedback, "createdAt") ON public.ratings TO anon, authenticated';
  EXECUTE 'GRANT INSERT (id, "userId", "lessonId", "pathId", score, feedback, "updatedAt") ON public.ratings TO authenticated';
  EXECUTE 'GRANT UPDATE (score, feedback, "updatedAt") ON public.ratings TO authenticated';

  -- ─── PLACEMENT_QUESTIONS ───────────────────────────────────────────────
  -- The baseline comment assumed correctOptionId was "filtered server-side by
  -- never selecting it", but a row policy cannot hide a column: it was
  -- readable through the Data API. Revoke it, and the answer key with it.
  -- `explanation` gives the answer away too, so it stays server-side as well.
  EXECUTE 'REVOKE ALL ON public.placement_questions FROM anon, authenticated';
  EXECUTE 'GRANT SELECT (id, category, difficulty, question, options, "orderIndex", "isActive") ON public.placement_questions TO anon, authenticated';
END $$;

-- ─── Policy tightening (role-independent) ────────────────────────────────

-- A client may only ever create its own row as a STUDENT. Column privileges
-- already block writing `role`; this keeps the intent explicit and holds even
-- if a future grant widens the writable column set.
DROP POLICY IF EXISTS "users_insert_self" ON public.users;
CREATE POLICY "users_insert_self" ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id AND role = 'STUDENT');

-- Opening a lesson is the only progress the client may declare. Completions
-- are awarded server-side after the work is validated.
DROP POLICY IF EXISTS "progress_self_insert" ON public.user_lesson_progress;
CREATE POLICY "progress_self_insert" ON public.user_lesson_progress FOR INSERT
  WITH CHECK (auth.uid() = "userId" AND status = 'IN_PROGRESS');

DROP POLICY IF EXISTS "progress_self_update" ON public.user_lesson_progress;
CREATE POLICY "progress_self_update" ON public.user_lesson_progress FOR UPDATE
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

-- Certificates: holders read their own; anonymous verification stays a
-- server-side lookup by publicId.
DROP POLICY IF EXISTS "certificates_select_public" ON public.certificates;
DROP POLICY IF EXISTS "certificates_select_self" ON public.certificates;
CREATE POLICY "certificates_select_self" ON public.certificates FOR SELECT
  USING (auth.uid() = "userId");

-- Ratings: a score outside 1..5 poisons the public average, and the column is
-- client-writable, so constrain it in the database.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ratings_score_range'
  ) THEN
    ALTER TABLE public.ratings
      ADD CONSTRAINT ratings_score_range CHECK (score >= 1 AND score <= 5);
  END IF;
END $$;
