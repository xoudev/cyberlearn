-- Make losing a role take effect now, not at the next token refresh.
--
-- current_user_role() read the role out of the access token:
--
--   SELECT (auth.jwt() -> 'app_metadata' ->> 'user_role')::text
--
-- That claim is stamped once, when the token is issued by the
-- custom-access-token hook. Demote an admin and their existing token keeps
-- saying ADMIN until it expires, so the 44 RLS policies that ask
-- `current_user_role() = 'ADMIN'` keep letting them through for the rest of the
-- token's life. Revoking access was not revoking access.
--
-- The database now answers from the users table, which is the only place the
-- role is actually true. Both directions are immediate: a promotion lands on
-- the next query too, with no refresh to wait for and nothing to explain about
-- why one direction is instant and the other is not.
--
-- CREATE OR REPLACE keeps the function OID, so every policy referencing it
-- stays valid and the pg_policies count is untouched.
--
-- SECURITY DEFINER is required here, twice over, not chosen for convenience:
--
--   1. Recursion. `users_admin_all ON public.users USING
--      (current_user_role() = 'ADMIN')` means evaluating a row of users calls
--      this function; if the function read users with the caller's rights, that
--      read would evaluate the policy again, and Postgres answers that with
--      infinite recursion. Definer rights run the lookup outside RLS.
--   2. Column privileges. 20260725000000_rls_column_hardening grants
--      `authenticated` SELECT on (id, username, displayName, avatarUrl,
--      xpTotal, level, streakDays, longestStreak) only - `role` is deliberately
--      not among them. An invoker-rights read of u.role would raise
--      "permission denied for column role" rather than return a value.
--
-- Cost, measured rather than assumed: on 200k rows under a
-- `owner OR current_user_role() = 'ADMIN'` policy, a caller owning every row is
-- unchanged (the OR short-circuits before the function runs), and the worst
-- case - a caller owning none of them, so the function runs per row - goes from
-- ~500ms to ~680ms. That path is the Data API; the apps read through Prisma as
-- the table owner and never evaluate these policies at all.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.role::text FROM public.users u WHERE u.id = auth.uid();
$$;
