-- Ratings are written by the server, and their comments stay private.
--
-- The baseline let a signed-in client insert and update its own ratings
-- through the Data API. Nothing in the web or the app ever did: ratings go
-- through server actions, which check that the lesson was completed (or, for
-- a path, one of its lessons) and recompute the average stored on the lesson
-- or the path in the same transaction. A rating written around them skipped
-- both: a lesson rated without being read, and an average that no longer
-- matched its ratings.
--
-- The comment (`feedback`) was also readable by anyone holding the anon key.
-- It is written to the team, not to the other learners.

DROP POLICY IF EXISTS "ratings_self_write" ON public.ratings;
DROP POLICY IF EXISTS "ratings_self_update" ON public.ratings;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE 'REVOKE ALL ON public.ratings FROM anon, authenticated';
  EXECUTE 'GRANT SELECT (id, "lessonId", "pathId", score, "createdAt") ON public.ratings TO anon, authenticated';
END
$$;
