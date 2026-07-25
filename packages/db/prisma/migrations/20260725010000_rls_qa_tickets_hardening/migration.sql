-- Closes the remaining write surface the public Data API (PostgREST) exposes.
--
-- Same premise as 20260725000000_rls_column_hardening: the anon key ships in
-- the web bundle and in the Expo app, so `anon` and `authenticated` reach these
-- tables directly. The baseline policies were written as if the Next.js server
-- were the only client, and three of them let a client write rows no client
-- ever writes in practice.
--
-- Confirmed by grepping every client: apps/mobile/lib only ever touches users,
-- lessons, paths, certificates, notes, notifications, quests, cosmetics and the
-- progress tables, and the web app has no supabase-js call for any of the three
-- tables below. Contact tickets go through a server action (Prisma), and the
-- whole Q&A feature goes through packages/db/src/repositories/qa.repository.ts
-- (Prisma again). Server code connects as the table owner or as service_role,
-- so none of it is affected by these grants.

DO $$
BEGIN
  -- Plain Postgres (some local setups) has no Supabase roles: nothing to grant.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;

  -- ─── CONTACT_TICKETS ───────────────────────────────────────────────────
  -- `tickets_insert_public WITH CHECK (true)` let anyone holding the anon key
  -- POST straight to /rest/v1/contact_tickets, which walks past every defence
  -- the contact form has: the honeypot, the minimum fill time, the rate limit
  -- and the Zod validation all live in the server action. It also let the
  -- caller pick `userId`, `status` and `jiraIssueKey` freely.
  EXECUTE 'REVOKE ALL ON public.contact_tickets FROM anon, authenticated';

  -- ─── LESSON_QUESTIONS / LESSON_ANSWERS ─────────────────────────────────
  -- Both `*_self_update` policies had USING without WITH CHECK, so a user who
  -- owned a row could rewrite any column of it: mark their own answer
  -- `isAccepted`, set `upvotes` to an arbitrary number, unhide a moderated
  -- post, or hand the row to another `userId`. Nothing bounded `content`
  -- either - the length limit is Zod, in the server action.
  EXECUTE 'REVOKE ALL ON public.lesson_questions FROM anon, authenticated';
  EXECUTE 'REVOKE ALL ON public.lesson_answers FROM anon, authenticated';
END $$;

-- ─── Policy tightening (role-independent) ────────────────────────────────
-- The grants above are what actually stops the writes; these keep the intent
-- explicit and hold even if a future migration widens the grants again.

DROP POLICY IF EXISTS "tickets_insert_public" ON public.contact_tickets;

-- A row a client may read, it must not be able to rewrite into a row it could
-- not have created. USING alone only gates which rows are visible to the
-- UPDATE; WITH CHECK is what validates the row it leaves behind.
DROP POLICY IF EXISTS "questions_self_update" ON public.lesson_questions;
CREATE POLICY "questions_self_update" ON public.lesson_questions FOR UPDATE
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

DROP POLICY IF EXISTS "answers_self_update" ON public.lesson_answers;
CREATE POLICY "answers_self_update" ON public.lesson_answers FOR UPDATE
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");
