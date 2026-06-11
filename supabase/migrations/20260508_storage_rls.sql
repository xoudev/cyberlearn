-- =============================================================================
-- Storage RLS - Defense in depth for the certificates bucket
--
-- Context:
--   The application already uses service_role exclusively for all Storage
--   operations (signed URL generation, PDF upload). These policies add a
--   defense-in-depth layer: even if a future developer accidentally wires a
--   browser-side Supabase client for certificates, no data can leak.
--
-- Pattern choice (<> not equality):
--   USING (bucket_id <> 'certificates') instead of USING (false).
--   The <> form ensures that OTHER buckets remain unaffected by these
--   policies and can define their own access rules independently. A USING
--   (false) policy would still be scoped to the declared FOR/TO role, but
--   <> is more explicit and easier to reason about under policy unions.
--
-- Avatars bucket:
--   NOT included. The current implementation serves avatars as static SVG
--   files from /public/avatars/ - there is no Supabase Storage bucket for
--   avatars. Add policies here if a custom avatar upload feature is built.
--
-- Applying this migration:
--   Option A (Supabase CLI):  supabase db push
--   Option B (dashboard SQL editor): paste and run in the SQL editor.
--   This script is idempotent: DROP POLICY IF EXISTS before every CREATE.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- SELECT - anon and authenticated users cannot list or read certificates
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "certificates_block_select" ON storage.objects;
CREATE POLICY "certificates_block_select"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id <> 'certificates');

-- ----------------------------------------------------------------------------
-- INSERT - anon and authenticated users cannot upload to certificates
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "certificates_block_insert" ON storage.objects;
CREATE POLICY "certificates_block_insert"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id <> 'certificates');

-- ----------------------------------------------------------------------------
-- UPDATE - anon and authenticated users cannot modify certificates objects
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "certificates_block_update" ON storage.objects;
CREATE POLICY "certificates_block_update"
  ON storage.objects
  FOR UPDATE
  TO anon, authenticated
  USING (bucket_id <> 'certificates');

-- ----------------------------------------------------------------------------
-- DELETE - anon and authenticated users cannot delete certificates objects
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "certificates_block_delete" ON storage.objects;
CREATE POLICY "certificates_block_delete"
  ON storage.objects
  FOR DELETE
  TO anon, authenticated
  USING (bucket_id <> 'certificates');

-- service_role is exempt from RLS by default in Supabase and requires no
-- explicit policy - all server-side operations continue to work as-is.
