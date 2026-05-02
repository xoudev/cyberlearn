-- Add resource fields to challenges
ALTER TABLE "challenges"
  ADD COLUMN "attachmentUrl" TEXT,
  ADD COLUMN "resourceUrl"   TEXT;

-- CreateTable challenge_hints
CREATE TABLE "challenge_hints" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "challengeId" UUID NOT NULL,
    "orderIndex"  INTEGER NOT NULL DEFAULT 0,
    "content"     TEXT NOT NULL,
    "xpCost"      INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "challenge_hints_pkey" PRIMARY KEY ("id")
);

-- CreateTable challenge_hint_reveals
CREATE TABLE "challenge_hint_reveals" (
    "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId"     UUID NOT NULL,
    "hintId"     UUID NOT NULL,
    "revealedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_hint_reveals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "challenge_hints_challengeId_orderIndex_idx" ON "challenge_hints"("challengeId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_hint_reveals_userId_hintId_key" ON "challenge_hint_reveals"("userId", "hintId");
CREATE INDEX "challenge_hint_reveals_userId_idx" ON "challenge_hint_reveals"("userId");

-- AddForeignKey
ALTER TABLE "challenge_hints" ADD CONSTRAINT "challenge_hints_challengeId_fkey"
    FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "challenge_hint_reveals" ADD CONSTRAINT "challenge_hint_reveals_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "challenge_hint_reveals" ADD CONSTRAINT "challenge_hint_reveals_hintId_fkey"
    FOREIGN KEY ("hintId") REFERENCES "challenge_hints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
