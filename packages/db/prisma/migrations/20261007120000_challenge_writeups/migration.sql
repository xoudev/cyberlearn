-- Write-ups: a learner's solution to a challenge, published once it is solved.
--
-- Only the others who solved the same challenge read them: a write-up is the
-- answer, and showing it to somebody still looking would end the challenge for
-- them. One per person and challenge, a new version replacing the old one.
-- Screened like the forum and the lesson Q&A: what the screen flags is written
-- hidden and goes to the moderation queue, to be restored or destroyed there.

-- CreateTable
CREATE TABLE "challenge_writeups" (
    "id" UUID NOT NULL,
    "challengeId" UUID NOT NULL,
    "userId" UUID,
    "content" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_writeups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "challenge_writeups_challengeId_userId_key" ON "challenge_writeups"("challengeId", "userId");

-- CreateIndex
CREATE INDEX "challenge_writeups_challengeId_isHidden_idx" ON "challenge_writeups"("challengeId", "isHidden");

-- AddForeignKey
ALTER TABLE "challenge_writeups" ADD CONSTRAINT "challenge_writeups_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_writeups" ADD CONSTRAINT "challenge_writeups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Row level security ──────────────────────────────────────────────────────
-- An author reads their own write-ups. Who else may read one depends on who
-- solved the challenge, which lives in user_challenge_progress, a table the
-- clients cannot read at all (RLS with no policy, 20260610200000_rls_baseline):
-- that rule is the server's, applied before anything leaves it. Nothing grants
-- an insert, an update or a delete: the server writes the rows, after checking
-- the challenge is solved and screening the text.
ALTER TABLE "challenge_writeups" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "challenge_writeups_select_own" ON public.challenge_writeups;
CREATE POLICY "challenge_writeups_select_own" ON public.challenge_writeups FOR SELECT
  USING (public.current_user_role() = 'ADMIN' OR "userId" = auth.uid());

-- Column privileges, as for the other tables the clients read
-- (20260725000000_rls_column_hardening): read only, whatever the defaults grant.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE 'REVOKE ALL ON public.challenge_writeups FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.challenge_writeups TO authenticated';
END
$$;
