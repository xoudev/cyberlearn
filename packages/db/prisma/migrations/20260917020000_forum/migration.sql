-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FORUM_REPLY';

-- CreateTable
CREATE TABLE "forum_categories" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(240) NOT NULL,
    "accent" VARCHAR(16) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forum_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_topics" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "authorId" UUID,
    "title" VARCHAR(160) NOT NULL,
    "slug" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "lastPostAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forum_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_posts" (
    "id" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "authorId" UUID,
    "content" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forum_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "forum_categories_slug_key" ON "forum_categories"("slug");

-- CreateIndex
CREATE INDEX "forum_topics_categoryId_isHidden_pinned_lastPostAt_idx" ON "forum_topics"("categoryId", "isHidden", "pinned", "lastPostAt");

-- CreateIndex
CREATE INDEX "forum_topics_authorId_idx" ON "forum_topics"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "forum_topics_categoryId_slug_key" ON "forum_topics"("categoryId", "slug");

-- CreateIndex
CREATE INDEX "forum_posts_topicId_isHidden_createdAt_idx" ON "forum_posts"("topicId", "isHidden", "createdAt");

-- CreateIndex
CREATE INDEX "forum_posts_authorId_idx" ON "forum_posts"("authorId");

-- AddForeignKey
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "forum_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "forum_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- ─── The sections ────────────────────────────────────────────────────────────
-- Seeded here rather than left to an administrator's first afternoon: a forum
-- whose front page is empty on the day it ships is a forum nobody posts in.
-- The four mirror the platform - its three domains plus the place for
-- everything that is not a domain - and they are editable afterwards, which is
-- the reason they are rows and not an enum.
INSERT INTO "forum_categories" ("id", "slug", "name", "description", "accent", "position", "updatedAt")
VALUES
  (gen_random_uuid(), 'general', 'Général', 'La vie de la plateforme, les présentations, et tout ce qui ne rentre pas ailleurs.', '#6E8BFF', 0, now()),
  (gen_random_uuid(), 'cybersecurite', 'Cybersécurité', 'Failles, CTF, outils, veille : le domaine le plus suivi de la plateforme.', '#FF4757', 1, now()),
  (gen_random_uuid(), 'developpement', 'Développement', 'Code, langages, bonnes pratiques et revues entre élèves.', '#6E8BFF', 2, now()),
  (gen_random_uuid(), 'reseau', 'Réseau', 'Protocoles, architecture, labs et matériel.', '#0AFFD4', 3, now()),
  (gen_random_uuid(), 'entraide', 'Entraide', 'Une question sur une leçon, un exercice bloqué, un coup de main demandé.', '#FFB020', 4, now())
ON CONFLICT ("slug") DO NOTHING;

-- ─── Row level security ──────────────────────────────────────────────────────
-- The forum is behind a login and readable by everyone who has one: that is
-- what a forum is. What the policies enforce is the one thing that is not
-- public - hidden rows. A post removed by moderation stops being readable
-- through the Data API, rather than being merely filtered out by whichever
-- query happened to remember the isHidden clause.
--
-- Writes hold no policy at all and are therefore refused outright: every write
-- goes through Prisma, which connects as the table owner and bypasses RLS, and
-- which screens the text on the way in. A write path that skipped that is
-- exactly what must not exist.
ALTER TABLE "forum_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "forum_topics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "forum_posts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forum_categories_select_authenticated" ON public.forum_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "forum_topics_select_visible" ON public.forum_topics FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND "isHidden" = false)
    OR "authorId" = auth.uid()
    OR public.current_user_role() = 'ADMIN'
  );

-- A hidden topic takes its replies with it. Without the topic clause, a
-- removed thread stayed readable one post at a time.
CREATE POLICY "forum_posts_select_visible" ON public.forum_posts FOR SELECT
  USING (
    (
      auth.uid() IS NOT NULL
      AND "isHidden" = false
      AND EXISTS (
        SELECT 1 FROM public.forum_topics t
        WHERE t.id = forum_posts."topicId" AND t."isHidden" = false
      )
    )
    OR "authorId" = auth.uid()
    OR public.current_user_role() = 'ADMIN'
  );
