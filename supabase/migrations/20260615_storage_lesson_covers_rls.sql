-- =============================================================================
-- Storage RLS - private "lesson-covers" bucket (admin-uploaded lesson covers)
--
-- Context:
--   Lesson cover images are stored in a PRIVATE bucket. All Storage operations
--   go through service_role server-side (validated upload in admin, signed-URL
--   reads in the catalog). These policies are defense in depth: anon and
--   authenticated clients can never read, write, or delete cover objects.
--
-- IMPORTANT - why RESTRICTIVE (not the permissive `<>` form used by certificates):
--   Permissive policies are OR-combined. The certificates policies use a
--   permissive `USING (bucket_id <> 'certificates')`, which already GRANTS
--   anon/authenticated access to every non-certificates object. A second
--   permissive `USING (bucket_id <> 'lesson-covers')` would union in and grant
--   the certificates bucket (certificates <> lesson-covers is true), re-opening
--   it. RESTRICTIVE policies are AND-combined and can only remove access, so
--   they block lesson-covers without affecting any other bucket.
--
-- service_role is exempt from RLS by default in Supabase, so all server-side
-- cover operations keep working with no explicit allow policy.
--
-- Idempotent: DROP POLICY IF EXISTS before every CREATE.
-- =============================================================================

-- SELECT - anon and authenticated cannot read lesson-cover objects
DROP POLICY IF EXISTS "lesson_covers_block_select" ON storage.objects;
CREATE POLICY "lesson_covers_block_select"
  ON storage.objects
  AS RESTRICTIVE
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id <> 'lesson-covers');

-- INSERT - anon and authenticated cannot upload lesson-cover objects
DROP POLICY IF EXISTS "lesson_covers_block_insert" ON storage.objects;
CREATE POLICY "lesson_covers_block_insert"
  ON storage.objects
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id <> 'lesson-covers');

-- UPDATE - anon and authenticated cannot modify lesson-cover objects
DROP POLICY IF EXISTS "lesson_covers_block_update" ON storage.objects;
CREATE POLICY "lesson_covers_block_update"
  ON storage.objects
  AS RESTRICTIVE
  FOR UPDATE
  TO anon, authenticated
  USING (bucket_id <> 'lesson-covers');

-- DELETE - anon and authenticated cannot delete lesson-cover objects
DROP POLICY IF EXISTS "lesson_covers_block_delete" ON storage.objects;
CREATE POLICY "lesson_covers_block_delete"
  ON storage.objects
  AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (bucket_id <> 'lesson-covers');
