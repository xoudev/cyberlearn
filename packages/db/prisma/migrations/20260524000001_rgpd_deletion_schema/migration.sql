-- RGPD Art. 17 — Account deletion schema
-- Enables anonymization of user-linked records on account deletion.
--
-- Strategy:
--   • Models with personal content (Certificate, Question, Answer, Rating,
--     ContactTicket) → FK made nullable + SET NULL on user deletion
--   • AuditLog → keeps UUID FK (actorId) + new actorHashedId TEXT for HMAC
--   • New: AccountDeletionToken for email-confirmed deletion flow

-- DropForeignKey (Cascade → SetNull transition requires FK rebuild)
ALTER TABLE "certificates" DROP CONSTRAINT "certificates_userId_fkey";
ALTER TABLE "lesson_answers" DROP CONSTRAINT "lesson_answers_userId_fkey";
ALTER TABLE "lesson_questions" DROP CONSTRAINT "lesson_questions_userId_fkey";
ALTER TABLE "ratings" DROP CONSTRAINT "ratings_userId_fkey";

-- AlterTable audit_logs
ALTER TABLE "audit_logs"
  ADD COLUMN "actorHashedId" TEXT,
  ADD COLUMN "anonymized"    BOOLEAN NOT NULL DEFAULT false;

-- AlterTable certificates
ALTER TABLE "certificates"
  ADD COLUMN  "holderName" TEXT,
  ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable contact_tickets
ALTER TABLE "contact_tickets" ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable lesson_answers
ALTER TABLE "lesson_answers" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable lesson_questions
ALTER TABLE "lesson_questions" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable ratings
ALTER TABLE "ratings" ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable account_deletion_tokens
CREATE TABLE "account_deletion_tokens" (
    "id"        TEXT                     NOT NULL,
    "userId"    UUID                     NOT NULL,
    "tokenHash" TEXT                     NOT NULL,
    "expiresAt" TIMESTAMP(3)             NOT NULL,
    "usedAt"    TIMESTAMP(3),
    "ip"        TEXT,
    "userAgent" VARCHAR(500),
    "createdAt" TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_deletion_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_deletion_tokens_tokenHash_key" ON "account_deletion_tokens"("tokenHash");
CREATE INDEX "account_deletion_tokens_userId_idx"    ON "account_deletion_tokens"("userId");
CREATE INDEX "account_deletion_tokens_expiresAt_idx" ON "account_deletion_tokens"("expiresAt");

-- CreateIndex (audit_logs)
CREATE INDEX "audit_logs_actorHashedId_idx" ON "audit_logs"("actorHashedId");

-- AddForeignKey (SET NULL replacements)
ALTER TABLE "ratings"
  ADD CONSTRAINT "ratings_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lesson_questions"
  ADD CONSTRAINT "lesson_questions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lesson_answers"
  ADD CONSTRAINT "lesson_answers_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "certificates"
  ADD CONSTRAINT "certificates_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (account_deletion_tokens)
ALTER TABLE "account_deletion_tokens"
  ADD CONSTRAINT "account_deletion_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
