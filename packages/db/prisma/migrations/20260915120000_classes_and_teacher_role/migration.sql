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

-- A class reaches its establishment through its promotion and only through it.
-- An establishmentId on classes as well would be a second path to the same
-- answer, and two paths can disagree - a class filed under campus A inside a
-- promotion belonging to campus B. One chain, no contradiction to reconcile.
CREATE TABLE "establishments" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" TEXT NOT NULL,
    "city" VARCHAR(120),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "establishments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "promotions" (
    "id" UUID NOT NULL,
    "establishmentId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" TEXT NOT NULL,
    "startYear" INTEGER,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "classes" (
    "id" UUID NOT NULL,
    "promotionId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" TEXT NOT NULL,
    "description" VARCHAR(500),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- A class carries several teachers, because in a real school it does - one per
-- subject more often than not. A single teacherId column could only ever hold
-- the first, and the second would have had nowhere to go.
CREATE TABLE "class_teachers" (
    "classId" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "subject" VARCHAR(120),
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_teachers_pkey" PRIMARY KEY ("classId","teacherId")
);

CREATE TABLE "class_members" (
    "classId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_members_pkey" PRIMARY KEY ("classId","userId")
);

CREATE UNIQUE INDEX "establishments_slug_key" ON "establishments"("slug");
-- Scoped, not global: two establishments may each run a "2025-2026", and
-- "SIO1-A" exists in more than one school.
CREATE UNIQUE INDEX "promotions_establishmentId_slug_key" ON "promotions"("establishmentId", "slug");
CREATE INDEX "promotions_establishmentId_startYear_idx" ON "promotions"("establishmentId", "startYear");
CREATE UNIQUE INDEX "classes_promotionId_slug_key" ON "classes"("promotionId", "slug");
CREATE INDEX "class_teachers_teacherId_idx" ON "class_teachers"("teacherId");
CREATE INDEX "class_members_userId_idx" ON "class_members"("userId");

ALTER TABLE "promotions" ADD CONSTRAINT "promotions_establishmentId_fkey"
  FOREIGN KEY ("establishmentId") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "classes" ADD CONSTRAINT "classes_promotionId_fkey"
  FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
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
    SELECT 1 FROM public.class_teachers ct
    WHERE ct."classId" = target_class AND ct."teacherId" = auth.uid()
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

ALTER TABLE "establishments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "promotions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "classes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "class_teachers" ENABLE ROW LEVEL SECURITY;
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

-- Who teaches a class is readable by the same people who may read the class.
CREATE POLICY "class_teachers_select_classmates" ON public.class_teachers FOR SELECT
  USING (
    public.is_class_member("classId")
    OR public.is_class_teacher("classId")
    OR public.current_user_role() = 'ADMIN'
  );

CREATE POLICY "class_members_select_classmates" ON public.class_members FOR SELECT
  USING (
    public.is_class_member("classId")
    OR public.is_class_teacher("classId")
    OR public.current_user_role() = 'ADMIN'
  );

-- An establishment and a promotion are readable by whoever can reach a class
-- under them - so a student sees the school and the intake printed on their own
-- profile, and a teacher sees the ones their classes hang from, without either
-- being handed the whole directory.
CREATE POLICY "promotions_select_reachable" ON public.promotions FOR SELECT
  USING (
    public.current_user_role() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c."promotionId" = promotions.id
        AND (public.is_class_member(c.id) OR public.is_class_teacher(c.id))
    )
  );

CREATE POLICY "establishments_select_reachable" ON public.establishments FOR SELECT
  USING (
    public.current_user_role() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.promotions p
      JOIN public.classes c ON c."promotionId" = p.id
      WHERE p."establishmentId" = establishments.id
        AND (public.is_class_member(c.id) OR public.is_class_teacher(c.id))
    )
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
  EXECUTE 'REVOKE ALL ON public.establishments FROM anon, authenticated';
  EXECUTE 'REVOKE ALL ON public.promotions FROM anon, authenticated';
  EXECUTE 'REVOKE ALL ON public.classes FROM anon, authenticated';
  EXECUTE 'REVOKE ALL ON public.class_teachers FROM anon, authenticated';
  EXECUTE 'REVOKE ALL ON public.class_members FROM anon, authenticated';
END $$;
