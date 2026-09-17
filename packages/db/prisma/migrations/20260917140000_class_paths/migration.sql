-- A path a teacher builds for their own classes.
--
-- The same shape the lessons got in 20260916220000_class_lessons, because it is
-- the same rule: a CLASS path is PUBLISHED - the class has to be able to open
-- it - so "published" is no longer the same question as "in the catalogue", and
-- every read that conflates the two is a place the path escapes through.

-- The enum stops being about lessons alone the moment paths carry it. Renamed
-- rather than duplicated: two enums with the same two values is how they come
-- to disagree. A rename keeps every existing value and every column using it.
ALTER TYPE "LessonAudience" RENAME TO "ContentAudience";

-- AlterTable
ALTER TABLE "paths" ADD COLUMN "audience" "ContentAudience" NOT NULL DEFAULT 'CATALOGUE';
ALTER TABLE "paths" ADD COLUMN "authorId" UUID;

-- CreateIndex
CREATE INDEX "paths_authorId_idx" ON "paths"("authorId");

-- AddForeignKey
ALTER TABLE "paths" ADD CONSTRAINT "paths_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "path_classes" (
    "pathId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "path_classes_pkey" PRIMARY KEY ("pathId","classId")
);

-- CreateIndex
CREATE INDEX "path_classes_classId_idx" ON "path_classes"("classId");

-- AddForeignKey
ALTER TABLE "path_classes" ADD CONSTRAINT "path_classes_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "path_classes" ADD CONSTRAINT "path_classes_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ─── Row level security ──────────────────────────────────────────────────────
-- The baseline policy said "PUBLISHED or admin", which was the whole truth while
-- every path belonged to everyone. A published CLASS path would have been
-- readable through the Data API by anyone signed in - the one thing this exists
-- to prevent - so the policy grows the second half of the rule the application
-- already applies in its where clauses.
DROP POLICY IF EXISTS "paths_select_published" ON public.paths;
CREATE POLICY "paths_select_published" ON public.paths FOR SELECT
  USING (
    public.current_user_role() = 'ADMIN'
    OR (
      status = 'PUBLISHED'
      AND (
        audience = 'CATALOGUE'
        OR EXISTS (
          SELECT 1 FROM public.path_classes pc
          WHERE pc."pathId" = paths.id
            AND (
              public.is_class_member(pc."classId")
              OR public.is_class_teacher(pc."classId")
            )
        )
      )
    )
  );

-- Which classes a path is shown to is readable by those classes, so a student
-- can be told where it came from, and by nobody else.
ALTER TABLE "path_classes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "path_classes_select_class" ON public.path_classes FOR SELECT
  USING (
    public.is_class_member("classId")
    OR public.is_class_teacher("classId")
    OR public.current_user_role() = 'ADMIN'
  );

-- path_lessons said "USING (true)", which was fine while every path was open.
-- It now leaks the shape of a class path - which lessons are in it, in what
-- order - to anyone signed in, so it follows the path it belongs to.
DROP POLICY IF EXISTS "path_lessons_select" ON public.path_lessons;
CREATE POLICY "path_lessons_select" ON public.path_lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.paths p
      WHERE p.id = path_lessons."pathId"
        AND (
          p.audience = 'CATALOGUE'
          OR public.current_user_role() = 'ADMIN'
          OR EXISTS (
            SELECT 1 FROM public.path_classes pc
            WHERE pc."pathId" = p.id
              AND (
                public.is_class_member(pc."classId")
                OR public.is_class_teacher(pc."classId")
              )
          )
        )
    )
  );
