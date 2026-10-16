-- certificates: the name and the lesson count the PDF printed, kept with the row.
--
-- The public verification page (/verify/[publicId]) read the holder's current
-- display name and the path's current lesson count. A holder who renamed
-- themselves in the settings had cyberlearn.fr vouch for a certificate under
-- the new name, whatever it was, while the PDF carried the old one; and the
-- "Missions" figure moved each time a lesson was added to the path.
--
-- holderName was meant to be that snapshot from the start (see its comment in
-- schema.prisma) but nothing wrote it at issuance: only the RGPD erasure did.
-- apps/web/lib/certificates/issue.tsx now writes both columns with the values
-- it prints on the PDF.
--
-- The rows issued before get today's values, the closest the database holds:
-- the PDF itself is a file in Storage. From now on they no longer move. An
-- erased account's row keeps the "Utilisateur supprimé" the erasure wrote.
--
-- No policy to add: a column of a table whose RLS is already on, and no client
-- role can read it. 20260725000000_rls_column_hardening revoked the table from
-- anon and authenticated and granted back a list of columns; a new column is
-- on no list, so it stays with the server.

-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "lessonCount" INTEGER;

-- Backfill
UPDATE "certificates" AS c
SET "holderName" = u."displayName"
FROM "users" AS u
WHERE c."userId" = u."id"
  AND c."holderName" IS NULL;

UPDATE "certificates" AS c
SET "lessonCount" = (
  SELECT COUNT(*)::INTEGER FROM "path_lessons" AS pl WHERE pl."pathId" = c."pathId"
)
WHERE c."lessonCount" IS NULL;
