-- CreateEnum
CREATE TYPE "LessonAudience" AS ENUM ('CATALOGUE', 'CLASS');

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "audience" "LessonAudience" NOT NULL DEFAULT 'CATALOGUE';

-- CreateTable
CREATE TABLE "lesson_classes" (
    "lessonId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_classes_pkey" PRIMARY KEY ("lessonId","classId")
);

-- CreateIndex
CREATE INDEX "lesson_classes_classId_idx" ON "lesson_classes"("classId");

-- AddForeignKey
ALTER TABLE "lesson_classes" ADD CONSTRAINT "lesson_classes_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_classes" ADD CONSTRAINT "lesson_classes_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ─── Row level security ──────────────────────────────────────────────────────
-- The baseline policy said "PUBLISHED or admin", which was the whole truth
-- while every lesson belonged to everyone. A published CLASS lesson would have
-- been readable through the Data API by anyone signed in - the one thing this
-- feature exists to prevent - so the policy grows the second half of the rule
-- the application already applies in its where clauses.
DROP POLICY IF EXISTS "lessons_select_published" ON public.lessons;
CREATE POLICY "lessons_select_published" ON public.lessons FOR SELECT
  USING (
    public.current_user_role() = 'ADMIN'
    OR (
      status = 'PUBLISHED'
      AND (
        audience = 'CATALOGUE'
        OR EXISTS (
          SELECT 1 FROM public.lesson_classes lc
          WHERE lc."lessonId" = lessons.id
            AND (
              public.is_class_member(lc."classId")
              OR public.is_class_teacher(lc."classId")
            )
        )
      )
    )
  );

-- Which classes a lesson is shown to is readable by those classes, so a student
-- can be told where the lesson came from, and by nobody else.
ALTER TABLE "lesson_classes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lesson_classes_select_class" ON public.lesson_classes FOR SELECT
  USING (
    public.is_class_member("classId")
    OR public.is_class_teacher("classId")
    OR public.current_user_role() = 'ADMIN'
  );
