-- =============================================================================
-- Storage RLS - private "avatars" bucket (custom avatar uploads)
--
-- Context:
--   Custom avatar uploads (ADR-003) are stored in a PRIVATE bucket. All Storage
--   operations go through service_role server-side (validated upload, signed-URL
--   reads). These policies are defense in depth: even if a future developer
--   wired a browser-side Supabase client for avatars, no object could be read,
--   written, or deleted by anon/authenticated clients.
--
-- Pattern choice (<> not equality), identical to 20260508_storage_rls.sql:
--   USING (bucket_id <> 'avatars') keeps OTHER buckets unaffected by these
--   policies (policies on storage.objects union across all buckets).
--
-- service_role is exempt from RLS by default in Supabase, so all server-side
-- avatar operations keep working with no explicit allow policy.
--
-- Idempotent: DROP POLICY IF EXISTS before every CREATE.
-- =============================================================================

-- SELECT - anon and authenticated cannot list or read avatars
DROP POLICY IF EXISTS "avatars_block_select" ON storage.objects;
CREATE POLICY "avatars_block_select"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id <> 'avatars');

-- INSERT - anon and authenticated cannot upload to avatars
DROP POLICY IF EXISTS "avatars_block_insert" ON storage.objects;
CREATE POLICY "avatars_block_insert"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id <> 'avatars');

-- UPDATE - anon and authenticated cannot modify avatars objects
DROP POLICY IF EXISTS "avatars_block_update" ON storage.objects;
CREATE POLICY "avatars_block_update"
  ON storage.objects
  FOR UPDATE
  TO anon, authenticated
  USING (bucket_id <> 'avatars');

-- DELETE - anon and authenticated cannot delete avatars objects
DROP POLICY IF EXISTS "avatars_block_delete" ON storage.objects;
CREATE POLICY "avatars_block_delete"
  ON storage.objects
  FOR DELETE
  TO anon, authenticated
  USING (bucket_id <> 'avatars');
