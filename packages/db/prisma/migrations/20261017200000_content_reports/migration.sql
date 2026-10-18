-- Learners reporting what other people published, and the console's hand on
-- class resources.
--
-- A forum message, a question or an answer under a lesson, a challenge
-- solution and a class resource can now be reported, with a reason, from the
-- site and the app. Kept apart from moderation_events on purpose, as
-- note_reports are: those rows are attached to the author and count towards
-- the flags that restrict an account, and a report is somebody's claim, not a
-- verdict. contentId points into the table its surface names and has no
-- foreign key, since one column cannot reference five tables: the console
-- closes a destroyed row's open reports in the same transaction.
--
-- class_resources had no way to be taken down without being deleted. The
-- other four tables already carry isHidden; this gives the fifth one, and the
-- students' policy leaves a hidden resource out.


-- CreateEnum
CREATE TYPE "ContentReportSurface" AS ENUM ('FORUM_POST', 'LESSON_QUESTION', 'LESSON_ANSWER', 'CHALLENGE_WRITEUP', 'CLASS_RESOURCE');

-- CreateEnum
CREATE TYPE "ContentReportReason" AS ENUM ('HATE', 'SEXUAL', 'SPAM', 'PERSONAL_DATA', 'OTHER');

-- CreateEnum
CREATE TYPE "ContentReportStatus" AS ENUM ('OPEN', 'HIDDEN', 'DELETED', 'DISMISSED');

-- AlterTable
ALTER TABLE "class_resources" ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "content_reports" (
    "id" UUID NOT NULL,
    "surface" "ContentReportSurface" NOT NULL,
    "contentId" UUID NOT NULL,
    "reporterId" UUID,
    "reason" "ContentReportReason" NOT NULL,
    "comment" VARCHAR(500),
    "status" "ContentReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_reports_status_idx" ON "content_reports"("status");

-- CreateIndex
CREATE INDEX "content_reports_surface_contentId_idx" ON "content_reports"("surface", "contentId");

-- One report per reporter and content: reporting again updates the row. A
-- null reporterId (an erased account) does not collide, which is what keeps
-- those reports.
-- CreateIndex
CREATE UNIQUE INDEX "content_reports_reporterId_surface_contentId_key" ON "content_reports"("reporterId", "surface", "contentId");

-- AddForeignKey
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─── Row level security ──────────────────────────────────────────────────────
-- A reporter reads their own reports, and nobody else's: the comment is written
-- for the team, and who reported something is not its author's to know.
-- Nothing grants an insert, an update or a delete. A report is written by the
-- server, which checks the reporter can see what they report and did not
-- write it.
ALTER TABLE "content_reports" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_reports_select_own" ON public.content_reports;
CREATE POLICY "content_reports_select_own" ON public.content_reports FOR SELECT
  USING (public.current_user_role() = 'ADMIN' OR "reporterId" = auth.uid());

-- Column privileges, as for the other tables the clients read
-- (20260725000000_rls_column_hardening): read only, whatever the defaults grant.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE 'REVOKE ALL ON public.content_reports FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.content_reports TO authenticated';
END
$$;

-- A class resource the moderation took down is out of its students' sight,
-- through the Data API as through the site: the same policy as before
-- (20260916230000_class_resources), with "isHidden" added to the students'
-- branch. Its teachers and the administrators still read it, so the teacher
-- sees what was taken down rather than a resource that vanished.
DROP POLICY IF EXISTS "class_resources_select" ON public.class_resources;
CREATE POLICY "class_resources_select" ON public.class_resources FOR SELECT
  USING (
    public.current_user_role() = 'ADMIN'
    OR public.is_class_teacher("classId")
    OR (
      public.is_class_member("classId")
      AND NOT "isHidden"
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
