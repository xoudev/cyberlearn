-- users: each account reads its own row, and nobody reads anybody else's.
--
-- 20260725000000_rls_column_hardening took email and role off the Data API
-- with column privileges, but left `users_select_public USING (true)` for the
-- rest, granted to anon: anyone holding the public anon key (it ships in the
-- web bundle and in the app) could list every account's username, display
-- name, avatar, XP and streaks with one request. That walked straight past the
-- leaderboard's privacy settings, which the server applies when it builds the
-- ranking and which a direct read never meets.
--
-- Nothing needs that read. The app reads its own row (apps/mobile: profile,
-- onboarding, account header); the site reads through the server, which
-- connects as the table owner and is not affected by any of this.
--
-- bio joins the readable columns now that a row is only ever its owner's: the
-- app's profile and onboarding screens select it, and a column privilege the
-- hardening withheld made those reads fail.

DROP POLICY IF EXISTS "users_select_public" ON public.users;
DROP POLICY IF EXISTS "users_select_self" ON public.users;
CREATE POLICY "users_select_self" ON public.users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DO $$
BEGIN
  -- Plain Postgres (some local setups) has no Supabase roles: nothing to grant.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;

  -- Revoking the table privilege revokes its column privileges with it.
  EXECUTE 'REVOKE SELECT ON public.users FROM anon';
  EXECUTE 'GRANT SELECT (bio) ON public.users TO authenticated';
END
$$;
