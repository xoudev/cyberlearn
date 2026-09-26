# ADR-004 - Badge icons: one public bucket, closed to every client

Date: 2026-09-26
Status: Accepted

## Context

The storage convention (AGENTS.md) is: every Supabase Storage bucket is
private, reached through `service_role` and short-lived signed URLs, and any
exception needs an ADR.

The badge icons live in a `Badge` bucket that was created **public** from the
dashboard, without an ADR and without versioned policies. Admins paste the
icon's public URL into the badge form (`iconUrl`), and the icon is drawn by the
site (`<img>` in `BadgeMedallion`) and by the app (`SvgCssUri`).

Checking it on 2026-09-26 turned up more than a missing document. The
certificates policies (`supabase/migrations/20260508_storage_rls.sql`) are
permissive, `USING (bucket_id <> 'certificates')`, and a permissive policy
grants. They gave `anon` and `authenticated` SELECT, INSERT, UPDATE and DELETE
on every bucket other than certificates. Avatars and lesson-covers were closed
again by restrictive policies of their own; `Badge` was not. An anonymous list
of the bucket with the public anon key returned its files, and the same grants
allowed an upload, an overwrite or a deletion. Anybody could have replaced an
icon that every profile shows.

## Decision

1. **The icons stay in a public bucket.** They are the same for everybody,
   carry no personal data, and are drawn on public pages and in the app.
   Signed URLs would add a server round trip to every badge on every screen
   for nothing they protect, and would break an icon URL an admin pastes.
2. **No client reaches Storage, in any bucket.**
   `supabase/migrations/20260926_storage_client_access_blocked.sql` adds
   RESTRICTIVE policies `USING (false)` / `WITH CHECK (false)` for `anon` and
   `authenticated` on SELECT, INSERT, UPDATE and DELETE of `storage.objects`.
   Restrictive policies are AND-combined, so they hold whatever permissive
   policy exists now or is added later, and they cover any bucket created from
   the dashboard in the future. Nothing in the web app, the admin console or
   the mobile app calls Storage from a client: every call is `service_role` on
   the server, and it is exempt from RLS.
3. **A public object is read only at its public URL.**
   `/storage/v1/object/public/Badge/<key>` does not consult these policies, so
   the icons keep loading.
4. **The bucket accepts images only**: `image/svg+xml`, `image/png`,
   `image/webp`, 256 KB at most. Uploads happen from the Supabase dashboard,
   by an administrator.

## Consequences

- The migration has to be applied to production by hand, like the other
  files in `supabase/migrations` (SQL editor or `supabase db push`). Until it
  is, the bucket stays writable with the anon key.
- An SVG in a public bucket is served from `*.supabase.co`, not from
  `cyberlearn.fr`: a script inside one would run on Supabase's origin, with
  none of our cookies. The site draws icons through `<img>`, where SVG scripts
  never run, and the app through react-native-svg, which does not run them
  either.
- `packages/db/src/__tests__/storage-public-bucket.integration.test.ts` holds
  the line in CI: the public URL serves the icon; listing, uploading,
  replacing and deleting with the anon key all fail.
- A new public bucket needs its own ADR, like this one. The restrictive
  policies already close it to clients the moment it is created.
