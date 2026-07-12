# ADR-003 - Custom avatar uploads: private bucket + signed URLs

Date: 2026-06-14
Status: Accepted

## Context

Users could only pick one of 8 built-in SVG avatars (served statically from
`/public/avatars`) or a generated glyph. We want them to upload their own
profile picture.

The project storage convention is: every Supabase Storage bucket is
**private by default**, accessed server-side via `service_role` + short-lived
signed URLs, with MIME types restricted per bucket; any exception requires an
ADR. Avatars are public-facing profile images (shown on public profiles and the
leaderboard), so a public-read bucket was considered. We deliberately keep the
strict **private** model to stay fully aligned with the convention and to avoid
exposing any object by a guessable/permanent URL.

## Decision

Add a private `avatars` bucket, mirroring the existing `certificates` setup:

- **Bucket**: `avatars`, `public = false`.
- **Storage RLS** (`supabase/migrations/*_storage_avatars_rls.sql`): `anon` and
  `authenticated` are blocked from SELECT/INSERT/UPDATE/DELETE on the bucket.
  The policies are **RESTRICTIVE** (`AS RESTRICTIVE ... USING (bucket_id <>
  'avatars')`): permissive policies are OR-combined, so a permissive
  `<> 'avatars'` policy would union with the certificates `<> 'certificates'`
  policy and re-open the certificates bucket. Restrictive policies are
  AND-combined and only remove access. Every operation goes through
  `service_role` server-side; the browser never touches Storage.
- **Storage value**: `User.avatarUrl` keeps holding a single string. An upload
  is stored as the marker `__upload:<userId>/<uuid>.<ext>`, alongside the
  existing `/avatars/*.svg` built-ins and `__glyph:*` markers.
- **Display**: server code resolves `__upload:` markers to a signed URL
  (TTL 1h, the documented maximum) via `service_role`, single or batched for
  lists. Resolved signed URLs render through a plain `<img>` (the CSP already
  allows `https://*.supabase.co` for `img-src`); built-ins/glyphs are unchanged.

## Security mitigations

- **Upload is server-mediated only** (service_role after auth + validation); no
  client-side upload, no public URL.
- **Format allowlist**: `image/jpeg`, `image/png`, `image/webp` only. **SVG is
  rejected** (script-injection / XSS vector when served from our origin).
- **Magic-byte sniffing**: the first bytes must match the declared MIME, so a
  spoofed `Content-Type` is rejected.
- **Size cap**: 2 MB.
- **Namespacing**: object key is `<userId>/<uuid>.<ext>`; random filename, no
  directory listing (private bucket), previous upload removed on replace.
- **Signed URLs are short-lived** (1h) and minted per request.

## Consequences

- Every avatar display site must resolve the marker server-side before render
  (the cost of the private model the team chose over public-read). A shared
  helper (`apps/web/lib/avatar/storage.ts`) centralizes single + batch signing.
- The `avatars` bucket must be provisioned in every environment (CI provisions
  it next to `certificates`; prod via the Supabase dashboard / CLI, same as
  certificates).
- Storage policies live in the `storage` schema, outside the public-schema RLS
  coverage gate, so they do not affect the >= 56 policy count.
