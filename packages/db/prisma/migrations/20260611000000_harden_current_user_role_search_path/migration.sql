-- Pin search_path on current_user_role() to satisfy the Supabase
-- function_search_path_mutable lint and harden against caller-context
-- name resolution. Body is unchanged: auth.jwt() is schema-qualified and
-- the ->, ->>, ::text operators live in pg_catalog, so an empty
-- search_path resolves everything. CREATE OR REPLACE preserves the
-- function OID, so the ~30 policies referencing it stay valid and the
-- pg_policies count is untouched (CI "Assert RLS coverage" passes as-is).
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'user_role')::text;
$$;
