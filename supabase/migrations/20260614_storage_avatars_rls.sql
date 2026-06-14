-- =============================================================================
-- Storage RLS - private "avatars" bucket (custom avatar uploads)
--
-- Context:
--   Custom avatar uploads (ADR-003) are stored in a PRIVATE bucket. All Storage
--   operations go through service_role server-side (validated upload, signed-URL
--   reads). These policies are defense in depth: anon/authenticated clients can
--   never read, write, or delete avatar objects.
--
-- IMPORTANT - why RESTRICTIVE (not the permissive `<>` form used by certificates):
--   Permissive policies are OR-combined. The certificates policies use a
--   permissive `USING (bucket_id <> 'certificates')`, which already GRANTS
--   anon/authenticated access to every non-certificates object. A second
--   permissive `USING (bucket_id <> 'avatars')` would union in and grant the
--   certificates bucket (certificates <> avatars is true), re-opening it.
--   RESTRICTIVE policies are AND-combined and can only remove access, so they
--   block the avatars bucket without affecting certificates or any other bucket.
--
-- service_role is exempt from RLS by default in Supabase, so all server-side
-- avatar operations keep working with no explicit allow policy.
--
-- Idempotent: DROP POLICY IF EXISTS before every CREATE.
-- =============================================================================

-- SELECT - anon and authenticated cannot read avatar objects
DROP POLICY IF EXISTS "avatars_block_select" ON storage.objects;
CREATE POLICY "avatars_block_select"
  ON storage.objects
  AS RESTRICTIVE
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id <> 'avatars');

-- INSERT - anon and authenticated cannot upload avatar objects
DROP POLICY IF EXISTS "avatars_block_insert" ON storage.objects;
CREATE POLICY "avatars_block_insert"
  ON storage.objects
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id <> 'avatars');

-- UPDATE - anon and authenticated cannot modify avatar objects
DROP POLICY IF EXISTS "avatars_block_update" ON storage.objects;
CREATE POLICY "avatars_block_update"
  ON storage.objects
  AS RESTRICTIVE
  FOR UPDATE
  TO anon, authenticated
  USING (bucket_id <> 'avatars');

-- DELETE - anon and authenticated cannot delete avatar objects
DROP POLICY IF EXISTS "avatars_block_delete" ON storage.objects;
CREATE POLICY "avatars_block_delete"
  ON storage.objects
  AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (bucket_id <> 'avatars');
