-- When the other side first read a message, stamped when it opens the
-- conversation: the console says when a learner saw the team's message, which
-- the conversation's own read mark (the last read only) could not tell.
-- The table's RLS is unchanged.

-- AlterTable
ALTER TABLE "direct_messages" ADD COLUMN     "seenAt" TIMESTAMP(3);


-- The messages already read when the column arrives: seen by the read mark of
-- the side that received them (the last read, so "seen by then"). Without
-- this, the next read would stamp them with its own time, later than the
-- moment they were really seen. Side A receives the team's messages and B's;
-- side B receives A's.
UPDATE "direct_messages" AS m
SET "seenAt" = c."userALastReadAt"
FROM "conversations" AS c
WHERE m."conversationId" = c.id
  AND m."seenAt" IS NULL
  AND c."userALastReadAt" IS NOT NULL
  AND c."userALastReadAt" >= m."createdAt"
  AND (m."fromTeam" OR m."senderId" IS DISTINCT FROM c."userAId");

UPDATE "direct_messages" AS m
SET "seenAt" = c."userBLastReadAt"
FROM "conversations" AS c
WHERE m."conversationId" = c.id
  AND m."seenAt" IS NULL
  AND c."userBLastReadAt" IS NOT NULL
  AND c."userBLastReadAt" >= m."createdAt"
  AND NOT m."fromTeam"
  AND m."senderId" = c."userAId";
