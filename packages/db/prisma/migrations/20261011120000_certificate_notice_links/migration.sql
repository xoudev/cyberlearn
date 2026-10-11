-- notifications: certificate notices point at the certificates page.
--
-- A CERTIFICATE_ISSUED notice used to store the PDF route,
-- /api/certificates/<id>/download, as its link. Followed from the bell, that
-- is a route handler answering 307 to a signed storage URL: the site's router
-- cannot open it as a page, and the reader gets a raw PDF download instead of
-- the list. New notices store /certificates (apps/web/lib/certificates/issue.tsx);
-- this rewrites the ones already sent, for the site and the app alike, which
-- read the same column.
--
-- Data only: no column, no table, no policy changes.

UPDATE "notifications"
SET "actionUrl" = '/certificates'
WHERE "actionUrl" ~ '^/api/certificates/[^/]+/download$';
