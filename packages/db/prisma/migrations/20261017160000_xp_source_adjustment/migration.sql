-- xp_ledger: corrections made by hand from the console.
--
-- An account's page in the console now adds XP or takes some back, with a
-- reason, and can take back the XP of a badge it removes. Each correction is a
-- line in the ledger like any other credit, so the week's and the month's
-- boards, which add the ledger up, and the season count it too. A source of
-- its own tells it apart from what was earned; the reason goes in the audit
-- row written in the same transaction, the ledger having no column for one.
-- XP taken back is a negative amount, never more than the total held.
--
-- No table and no policy: one enum value. xp_ledger keeps its RLS and its
-- policies (20260622000000_xp_ledger), and only the server writes it.

-- AlterEnum
ALTER TYPE "XpSource" ADD VALUE IF NOT EXISTS 'ADJUSTMENT';
