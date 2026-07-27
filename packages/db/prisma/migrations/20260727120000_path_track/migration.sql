-- A path answers two different questions, and `category` only answered one of
-- them: which domain it covers. `track` answers the other: is this a single
-- competence, or the job itself? A learner picking "I want to become a SOC
-- analyst" is not browsing the same list as one picking "I want to learn
-- Python", so the two are filtered apart.

CREATE TYPE "PathTrack" AS ENUM ('SKILL', 'CAREER');

ALTER TABLE "paths" ADD COLUMN "track" "PathTrack" NOT NULL DEFAULT 'SKILL';

CREATE INDEX "paths_track_status_idx" ON "paths"("track", "status");

-- Backfill the seeded catalogue. SKILL is the default and covers the languages,
-- the tools and the theory, so only the job-shaped paths are named here - each
-- one describes a role rather than a subject, and four of them say it in their
-- own description ("le métier de testeur d'intrusion", "le métier de la
-- défense au quotidien", "administrer un vrai serveur", "enquêter").
-- Editable per path in the admin afterwards; this is a starting point, not a
-- rule the application enforces.
UPDATE "paths"
SET "track" = 'CAREER'
WHERE "slug" IN (
  'pentest',              -- testeur d'intrusion
  'blue-team-soc',        -- analyste SOC
  'grc',                  -- gouvernance, risque et conformité
  'admin-systeme-linux',  -- administrateur système
  'osint'                 -- analyste en sources ouvertes
);
