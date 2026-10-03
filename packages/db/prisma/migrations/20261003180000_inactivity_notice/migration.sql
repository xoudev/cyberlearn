-- users: the notice that comes 30 days before an inactive account is erased.
--
-- The privacy policy says an account is erased after 24 months without a
-- sign-in (apps/web/app/privacy/page.tsx, section 4). The erasure waits for a
-- notice sent at least 30 days earlier, and the notice carries a link that
-- keeps the account: inactivityNoticeAt says when it went, and the link is
-- stored as a hash only.
--
-- No policy to add: these are columns of a table whose RLS is already on, and
-- no client role can read or write them. 20260725000000_rls_column_hardening
-- revoked the table from anon and authenticated and granted back a list of
-- columns; a new column is on no list, so it stays with the server.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "inactivityKeepTokenHash" TEXT,
ADD COLUMN     "inactivityNoticeAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_inactivityKeepTokenHash_key" ON "users"("inactivityKeepTokenHash");

-- CreateIndex
CREATE INDEX "users_lastActiveAt_idx" ON "users"("lastActiveAt");
