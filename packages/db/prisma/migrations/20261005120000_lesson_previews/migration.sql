-- The lesson editor's preview.
--
-- The editor used to draw an approximation of the lesson: a few components
-- sketched with regular expressions, the rest shown as a tag. The site now
-- renders the draft itself, with the components the learners get, in a frame
-- inside the editor. The draft travels through this table: the editor writes
-- it here under a random token, the site reads it back from the token in the
-- preview's address. Half an hour after its last refresh the row is of no use
-- and the retention job deletes it.

-- CreateTable
CREATE TABLE "lesson_previews" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "contentMdx" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_previews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lesson_previews_tokenHash_key" ON "lesson_previews"("tokenHash");

-- CreateIndex
CREATE INDEX "lesson_previews_userId_idx" ON "lesson_previews"("userId");

-- CreateIndex
CREATE INDEX "lesson_previews_expiresAt_idx" ON "lesson_previews"("expiresAt");

-- AddForeignKey
ALTER TABLE "lesson_previews" ADD CONSTRAINT "lesson_previews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Row level security ──────────────────────────────────────────────────────
-- An author reads their own drafts and nobody else's: a draft is unpublished
-- by definition. Nothing grants an insert, an update or a delete. The server
-- writes the rows (service role), after checking who asks and that the draft
-- renders, and the preview page reads them by token hash, never by listing.
ALTER TABLE "lesson_previews" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesson_previews_select_own" ON public.lesson_previews;
CREATE POLICY "lesson_previews_select_own" ON public.lesson_previews FOR SELECT
  USING (public.current_user_role() = 'ADMIN' OR "userId" = auth.uid());

-- Column privileges, as for the other tables the clients read
-- (20260725000000_rls_column_hardening): read only, whatever the defaults grant.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE 'REVOKE ALL ON public.lesson_previews FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.lesson_previews TO authenticated';
END
$$;
