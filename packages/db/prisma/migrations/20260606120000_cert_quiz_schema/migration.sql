-- Cert/quiz foundation (schema only — scoring & endpoints come in later pieces).
-- Certificate gains nullable score + passThreshold (legacy certs keep NULL) and a
-- unique (userId, pathId). NOTE: userId is nullable so RGPD-anonymized rows
-- (userId = NULL) never conflict. Before applying in PROD, confirm there are no
-- existing duplicate (userId, pathId) certificates or this index creation fails:
--   SELECT "userId", "pathId", count(*) FROM certificates
--   WHERE "userId" IS NOT NULL GROUP BY 1,2 HAVING count(*) > 1;

-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "passThreshold" INTEGER,
ADD COLUMN     "score" INTEGER;

-- CreateTable
CREATE TABLE "quiz" (
    "id" UUID NOT NULL,
    "pathId" UUID NOT NULL,
    "passThreshold" INTEGER NOT NULL DEFAULT 70,
    "questionsToDraw" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_questions" (
    "id" UUID NOT NULL,
    "quizId" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctOptionId" VARCHAR(10) NOT NULL,
    "explanation" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "quizId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "answers" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quiz_pathId_key" ON "quiz"("pathId");

-- CreateIndex
CREATE INDEX "quiz_questions_quizId_isActive_idx" ON "quiz_questions"("quizId", "isActive");

-- CreateIndex
CREATE INDEX "quiz_attempts_userId_quizId_idx" ON "quiz_attempts"("userId", "quizId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_userId_pathId_key" ON "certificates"("userId", "pathId");

-- AddForeignKey
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
