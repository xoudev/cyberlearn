-- Classes, and the TEACHER role that follows one.
--
-- Membership is a relation, not a role. A learner with no class is a STUDENT
-- whose membership list is empty, so there is no "USER vs student" flag to keep
-- in step with the class_members table - leaving a class cannot strand a stale
-- role behind.
--
-- TEACHER joins an enum that 44 RLS policies compare with
-- `current_user_role() = 'ADMIN'`. Every one of those is an allowlist, so the
-- new value grants nothing anywhere: a teacher starts with exactly the rights a
-- student has, plus what this migration hands them below.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'TEACHER' BEFORE 'ADMIN';

CREATE TABLE "classes" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" TEXT NOT NULL,
    "description" VARCHAR(500),
    "teacherId" UUID,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "class_members" (
    "classId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_members_pkey" PRIMARY KEY ("classId","userId")
);

CREATE UNIQUE INDEX "classes_slug_key" ON "classes"("slug");
CREATE INDEX "classes_teacherId_idx" ON "classes"("teacherId");
CREATE INDEX "class_members_userId_idx" ON "class_members"("userId");

ALTER TABLE "classes" ADD CONSTRAINT "classes_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "class_members" ADD CONSTRAINT "class_members_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_members" ADD CONSTRAINT "class_members_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
--
-- Both helpers are SECURITY DEFINER on purpose, and it is not a shortcut: a
-- policy on class_members that asked "is the caller in this class?" would query
-- class_members, which would evaluate the policy again, which would query
-- class_members. Postgres answers that with infinite recursion, not with a row.
-- SECURITY DEFINER runs the lookup as the owner, outside RLS, which breaks the
-- cycle. search_path is pinned to '' like current_user_role(), so every name
-- inside is schema-qualified and nothing resolves through the caller's path.

CREATE OR REPLACE FUNCTION public.is_class_member(target_class uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_members cm
    WHERE cm."classId" = target_class AND cm."userId" = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_class_teacher(target_class uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = target_class AND c."teacherId" = auth.uid()
  );
$$;

-- Revoked from PUBLIC, then handed back to authenticated explicitly. Without
-- the grant a policy that calls these does not evaluate to false - it raises
-- "permission denied for function", so the query errors instead of returning
-- no rows. Same shape as private.current_session_meets_mfa().
REVOKE ALL ON FUNCTION public.is_class_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_class_teacher(uuid) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_class_member(uuid) TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_class_teacher(uuid) TO authenticated';
  END IF;
END $$;

ALTER TABLE "classes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "class_members" ENABLE ROW LEVEL SECURITY;

-- A class is not public. Who is in one is the thing worth protecting here, so
-- it is readable by its own members, by the teacher who follows it, and by an
-- admin - nobody else, and never anonymously.
CREATE POLICY "classes_select_members" ON public.classes FOR SELECT
  USING (
    public.is_class_member(id)
    OR public.is_class_teacher(id)
    OR public.current_user_role() = 'ADMIN'
  );

CREATE POLICY "class_members_select_classmates" ON public.class_members FOR SELECT
  USING (
    public.is_class_member("classId")
    OR public.is_class_teacher("classId")
    OR public.current_user_role() = 'ADMIN'
  );

-- No INSERT/UPDATE/DELETE policy at all: composing a class is an admin action
-- and goes through Prisma, which connects as the table owner. A client holding
-- the anon key has no write path to reach for.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;

  -- The policies above state the intent; these grants are what actually stops
  -- the Data API. The anon key ships in the web bundle and in the Expo app, and
  -- no client reads a class directly - the web app loads it server-side through
  -- Prisma - so nothing needs this table exposed over PostgREST.
  EXECUTE 'REVOKE ALL ON public.classes FROM anon, authenticated';
  EXECUTE 'REVOKE ALL ON public.class_members FROM anon, authenticated';
END $$;
