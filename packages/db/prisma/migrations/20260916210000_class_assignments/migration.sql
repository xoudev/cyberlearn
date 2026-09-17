-- AlterEnum
-- IF NOT EXISTS so a re-run is a no-op rather than an error, matching
-- 20260916100000 which added CLASS_ENROLLED.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LESSON_ASSIGNED';

-- CreateTable
CREATE TABLE "class_assignments" (
    "id" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "assignedById" UUID,
    "instructions" VARCHAR(1000),
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_assignments_classId_dueAt_idx" ON "class_assignments"("classId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "class_assignments_classId_lessonId_key" ON "class_assignments"("classId", "lessonId");

-- AddForeignKey
ALTER TABLE "class_assignments" ADD CONSTRAINT "class_assignments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_assignments" ADD CONSTRAINT "class_assignments_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_assignments" ADD CONSTRAINT "class_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- ─── Row level security ──────────────────────────────────────────────────────
-- What a class has been told to do is readable by the same people who may read
-- the class: its members, the teachers who follow it, and an administrator.
-- Writes go through Prisma, which connects as the table owner and checks the
-- caller teaches the class in its where clause - this is the second line of
-- defence over the Data API, not the one enforcing it.
ALTER TABLE "class_assignments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_assignments_select_class" ON public.class_assignments FOR SELECT
  USING (
    public.is_class_member("classId")
    OR public.is_class_teacher("classId")
    OR public.current_user_role() = 'ADMIN'
  );
