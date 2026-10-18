-- The lesson studio: a draft per lesson, and a version at each publish.
--
-- The console used to write straight into "lessons": every save of a published
-- lesson went live, half-typed. The studio saves into lesson_drafts as the
-- administrator types, and "Publier les changements" copies the draft into the
-- lesson, bumps lessons.version and keeps what was published in
-- lesson_versions, from which a version can be restored into the draft.
--
-- The site and the mobile app read lessons.contentMdx, never these tables: a
-- learner sees only what was published.

-- CreateEnum
CREATE TYPE "LessonVersionSource" AS ENUM ('BASELINE', 'CONSOLE', 'IMPORT', 'SYNC');

-- CreateTable
CREATE TABLE "lesson_drafts" (
    "lessonId" UUID NOT NULL,
    "refCode" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "category" "Category" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "contentMdx" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "baseVersion" INTEGER NOT NULL,
    "baseContentHash" VARCHAR(64) NOT NULL,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_drafts_pkey" PRIMARY KEY ("lessonId")
);

-- CreateTable
CREATE TABLE "lesson_versions" (
    "id" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "source" "LessonVersionSource" NOT NULL,
    "refCode" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "category" "Category" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "contentMdx" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "publishedById" UUID,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lesson_drafts_updatedById_idx" ON "lesson_drafts"("updatedById");

-- CreateIndex
CREATE INDEX "lesson_versions_publishedById_idx" ON "lesson_versions"("publishedById");

-- One row per version of a lesson: two publishes racing for the same number
-- cannot both be kept.
CREATE UNIQUE INDEX "lesson_versions_lessonId_version_key" ON "lesson_versions"("lessonId", "version");

-- AddForeignKey
ALTER TABLE "lesson_drafts" ADD CONSTRAINT "lesson_drafts_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_drafts" ADD CONSTRAINT "lesson_drafts_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_versions" ADD CONSTRAINT "lesson_versions_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_versions" ADD CONSTRAINT "lesson_versions_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─── Row level security ──────────────────────────────────────────────────────
-- Both tables are the console's alone, like ticket_notes: the studio reads and
-- writes them through Prisma, which connects as the owner. A draft is what an
-- administrator has not published yet, and the site would leak it to anyone
-- who asked the Data API for it; a past version is no learner's business
-- either. One policy each reads for an administrator, and no client role holds
-- a privilege to use it with: the policies keep the intent written down should
-- a later migration widen the grants. Nothing grants an insert, an update or a
-- delete to anybody.
ALTER TABLE "lesson_drafts" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesson_drafts_select_admin" ON public.lesson_drafts;
CREATE POLICY "lesson_drafts_select_admin" ON public.lesson_drafts FOR SELECT
  USING (public.current_user_role() = 'ADMIN');

ALTER TABLE "lesson_versions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesson_versions_select_admin" ON public.lesson_versions;
CREATE POLICY "lesson_versions_select_admin" ON public.lesson_versions FOR SELECT
  USING (public.current_user_role() = 'ADMIN');

DO $$
BEGIN
  -- Plain Postgres (some local setups) has no Supabase roles: nothing to revoke.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE 'REVOKE ALL ON public.lesson_drafts FROM anon, authenticated';
  EXECUTE 'REVOKE ALL ON public.lesson_versions FROM anon, authenticated';
END
$$;
