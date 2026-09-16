-- CreateTable
CREATE TABLE "class_resources" (
    "id" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "assignmentId" UUID,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT,
    "url" VARCHAR(2000),
    "releasedAt" TIMESTAMP(3),
    "afterCompletion" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_resources_classId_releasedAt_idx" ON "class_resources"("classId", "releasedAt");

-- CreateIndex
CREATE INDEX "class_resources_assignmentId_idx" ON "class_resources"("assignmentId");

-- AddForeignKey
ALTER TABLE "class_resources" ADD CONSTRAINT "class_resources_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_resources" ADD CONSTRAINT "class_resources_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "class_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_resources" ADD CONSTRAINT "class_resources_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─── Row level security ──────────────────────────────────────────────────────
-- A teacher sees everything they have prepared, released or not - a corrigé
-- they cannot re-read before handing it out is a corrigé they cannot check.
--
-- A student sees it only once both conditions hold. They are repeated here
-- rather than left to the application because an answer key read a day early
-- through the Data API is the exact failure this table exists to prevent, and
-- "the app checks it" is not an answer when the row is reachable another way.
ALTER TABLE "class_resources" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_resources_select" ON public.class_resources FOR SELECT
  USING (
    public.current_user_role() = 'ADMIN'
    OR public.is_class_teacher("classId")
    OR (
      public.is_class_member("classId")
      AND ("releasedAt" IS NULL OR "releasedAt" <= now())
      AND (
        NOT "afterCompletion"
        OR "assignmentId" IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.class_assignments ca
          JOIN public.user_lesson_progress ulp
            ON ulp."lessonId" = ca."lessonId"
           AND ulp."userId" = auth.uid()
           AND ulp.status = 'COMPLETED'
          WHERE ca.id = class_resources."assignmentId"
        )
      )
    )
  );
