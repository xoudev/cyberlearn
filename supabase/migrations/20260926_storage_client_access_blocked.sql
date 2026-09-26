-- =============================================================================
-- Storage RLS - no client access to any bucket, and the public "Badge" bucket
-- held to images
--
-- Context:
--   The certificates policies (20260508_storage_rls.sql) are PERMISSIVE and
--   written `USING (bucket_id <> 'certificates')`. Permissive policies GRANT:
--   they gave anon and authenticated SELECT, INSERT, UPDATE and DELETE on every
--   bucket that is not certificates. Avatars and lesson-covers were closed
--   again by their own RESTRICTIVE policies; a bucket created later without
--   them was left open.
--
--   The "Badge" bucket was created from the dashboard, public, for the badge
--   icons. With the public anon key anyone could list it, and, by the same
--   grants, upload, overwrite or delete an icon that every profile shows.
--   Checked on 2026-09-26: an anonymous list of the bucket returned its files.
--
-- Decision (ADR-004):
--   Every Storage operation in this codebase goes through service_role on the
--   server (admin uploads, signed URLs, certificate PDFs, avatar uploads). No
--   client, web or mobile, calls Storage. So anon and authenticated are shut
--   out of storage.objects entirely, for every bucket present and future, by
--   RESTRICTIVE policies: they are AND-combined and only ever remove access,
--   whatever permissive policy exists or is added later.
--
--   Public buckets keep working: an object's public URL
--   (/storage/v1/object/public/<bucket>/<key>) is served without consulting
--   these policies. That is how the site and the app draw badge icons.
--
-- service_role is exempt from RLS, so every server-side operation is unchanged.
--
-- Idempotent: DROP POLICY IF EXISTS before every CREATE; the bucket update is a
-- no-op where the bucket does not exist (local stacks, CI).
-- =============================================================================

-- SELECT - no listing or API download by clients, in any bucket
DROP POLICY IF EXISTS "storage_clients_block_select" ON storage.objects;
CREATE POLICY "storage_clients_block_select"
  ON storage.objects
  AS RESTRICTIVE
  FOR SELECT
  TO anon, authenticated
  USING (false);

-- INSERT - no upload by clients, in any bucket
DROP POLICY IF EXISTS "storage_clients_block_insert" ON storage.objects;
CREATE POLICY "storage_clients_block_insert"
  ON storage.objects
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

-- UPDATE - no overwrite by clients, in any bucket
DROP POLICY IF EXISTS "storage_clients_block_update" ON storage.objects;
CREATE POLICY "storage_clients_block_update"
  ON storage.objects
  AS RESTRICTIVE
  FOR UPDATE
  TO anon, authenticated
  USING (false);

-- DELETE - no deletion by clients, in any bucket
DROP POLICY IF EXISTS "storage_clients_block_delete" ON storage.objects;
CREATE POLICY "storage_clients_block_delete"
  ON storage.objects
  AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (false);

-- The public badge-icon bucket: images only, 256 KB at most. An icon is a few
-- kilobytes; anything else in a public bucket is a file served from our
-- project's domain to whoever has the link.
UPDATE storage.buckets
  SET allowed_mime_types = ARRAY['image/svg+xml', 'image/png', 'image/webp'],
      file_size_limit = 262144
  WHERE id = 'Badge';
