-- Drop the redundant DB-level DEFAULT gen_random_uuid() on the challenge `id`
-- columns. Prisma generates these ids app-side (@default(uuid())); the DB
-- default was added by hand in the original challenge migrations
-- (20260501000001_add_challenges, 20260501000002_challenge_hints), creating
-- drift between schema.prisma and the database.
--
-- Metadata-only: a DROP DEFAULT does NOT touch existing rows (their ids are
-- already populated). Reversible per column with:
--   ALTER TABLE "<table>" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "challenges" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "user_challenge_progress" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "challenge_hints" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "challenge_hint_reveals" ALTER COLUMN "id" DROP DEFAULT;
