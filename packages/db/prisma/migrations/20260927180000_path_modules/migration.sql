-- AlterTable
ALTER TABLE "path_lessons" ADD COLUMN     "moduleId" UUID;

-- CreateTable
CREATE TABLE "path_modules" (
    "id" UUID NOT NULL,
    "pathId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "path_modules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "path_modules_pathId_position_key" ON "path_modules"("pathId", "position");

-- CreateIndex
CREATE INDEX "path_lessons_moduleId_idx" ON "path_lessons"("moduleId");

-- AddForeignKey
ALTER TABLE "path_modules" ADD CONSTRAINT "path_modules_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "path_lessons" ADD CONSTRAINT "path_lessons_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "path_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Row level security: a module is read like the lessons of its path
-- (path_lessons_select, 20260917140000_class_paths). A class path's modules
-- would otherwise tell anyone signed in how that class's path is laid out.
ALTER TABLE public.path_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "path_modules_select" ON public.path_modules;
CREATE POLICY "path_modules_select" ON public.path_modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.paths p
      WHERE p.id = path_modules."pathId"
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

-- Read only for the clients, whatever the defaults grant: modules are written
-- by the server (seed, console), never through the Data API.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;
  EXECUTE 'REVOKE ALL ON public.path_modules FROM anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.path_modules TO authenticated';
END
$$;
