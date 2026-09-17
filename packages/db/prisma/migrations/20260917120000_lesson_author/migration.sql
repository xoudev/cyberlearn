-- AlterTable
ALTER TABLE "lessons" ALTER COLUMN "authorId" DROP NOT NULL;

-- The column has never had a foreign key, so nothing stopped it from pointing
-- at an account that has since been erased. Adding the constraint below would
-- fail on the first such row, and the row is not worth failing a deploy over:
-- the lesson is still a lesson, it simply has nobody to credit.
UPDATE "lessons" l
SET "authorId" = NULL
WHERE l."authorId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u.id = l."authorId");

-- CreateIndex
CREATE INDEX "lessons_authorId_idx" ON "lessons"("authorId");

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
