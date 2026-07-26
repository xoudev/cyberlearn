-- Enforces optional MFA at the database boundary. Accounts without a verified
-- factor keep using AAL1; once a factor is verified, authenticated Data API
-- access requires an AAL2 JWT as well as each table's existing RLS policies.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.current_session_meets_mfa()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT
    NOT EXISTS (
      SELECT 1
      FROM auth.mfa_factors
      WHERE user_id = auth.uid()
        AND status = 'verified'
    )
    OR coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

REVOKE ALL ON FUNCTION private.current_session_meets_mfa() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT USAGE ON SCHEMA private TO authenticated;
    GRANT EXECUTE ON FUNCTION private.current_session_meets_mfa() TO authenticated;
  END IF;
END $$;

DO $$
DECLARE
  target record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;

  FOR target IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relrowsecurity
      AND c.relname <> '_prisma_migrations'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "mfa_verified_session" ON %I.%I',
      target.schema_name,
      target.table_name
    );
    EXECUTE format(
      'CREATE POLICY "mfa_verified_session" ON %I.%I AS RESTRICTIVE FOR ALL TO authenticated USING (private.current_session_meets_mfa()) WITH CHECK (private.current_session_meets_mfa())',
      target.schema_name,
      target.table_name
    );
  END LOOP;
END $$;

-- This event-trigger function exists on the hosted project but predates the
-- repository migrations. Event triggers still work without client EXECUTE.
DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
    END IF;
  END IF;
END $$;
