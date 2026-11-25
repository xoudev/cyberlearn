-- CreateEnum
CREATE TYPE "MessagePrivacy" AS ENUM ('EVERYONE', 'FRIENDS', 'NOBODY');

-- CreateEnum
CREATE TYPE "ConversationKind" AS ENUM ('DIRECT', 'TEAM');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'DECLINED');

-- AlterEnum
ALTER TYPE "ContentReportSurface" ADD VALUE 'DIRECT_MESSAGE';

-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "messagesFrom" "MessagePrivacy" NOT NULL DEFAULT 'EVERYONE';

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "kind" "ConversationKind" NOT NULL,
    "pairKey" VARCHAR(100) NOT NULL,
    "userAId" UUID NOT NULL,
    "userBId" UUID,
    "requestedById" UUID,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACCEPTED',
    "userALastReadAt" TIMESTAMP(3),
    "userBLastReadAt" TIMESTAMP(3),
    "teamLastReadAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_messages" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "senderId" UUID,
    "fromTeam" BOOLEAN NOT NULL DEFAULT false,
    "body" VARCHAR(1000) NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_blocks" (
    "blockerId" UUID NOT NULL,
    "blockedId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("blockerId","blockedId")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversations_pairKey_key" ON "conversations"("pairKey");

-- CreateIndex
CREATE INDEX "conversations_userAId_lastMessageAt_idx" ON "conversations"("userAId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "conversations_userBId_lastMessageAt_idx" ON "conversations"("userBId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "conversations_kind_lastMessageAt_idx" ON "conversations"("kind", "lastMessageAt");

-- CreateIndex
CREATE INDEX "direct_messages_conversationId_createdAt_idx" ON "direct_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "direct_messages_senderId_idx" ON "direct_messages"("senderId");

-- CreateIndex
CREATE INDEX "user_blocks_blockedId_idx" ON "user_blocks"("blockedId");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Row Level Security. Every write goes through the server (Prisma, which the
-- policies do not bind): a client may only read, and only its own side. The
-- console reads a conversation only through the server either, never over the
-- Data API: no administrator policy here on purpose, a private conversation is
-- nobody else's to read. A reported message reaches the moderation queue on
-- its own, through content_reports.

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_member_select" ON public.conversations;
CREATE POLICY "conversations_member_select" ON public.conversations FOR SELECT
  USING (auth.uid() = "userAId" OR auth.uid() = "userBId");

-- The rows Realtime pushes to a subscriber go through this policy too: a
-- member of the conversation receives its new messages, and nobody else does.
-- A message taken down after a report is out of reach.
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "direct_messages_member_select" ON public.direct_messages;
CREATE POLICY "direct_messages_member_select" ON public.direct_messages FOR SELECT
  USING (
    "isHidden" = false
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = direct_messages."conversationId"
        AND (auth.uid() = c."userAId" OR auth.uid() = c."userBId")
    )
  );

-- Who one has blocked is one's own business; being blocked is not shown.
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_blocks_self_select" ON public.user_blocks;
CREATE POLICY "user_blocks_self_select" ON public.user_blocks FOR SELECT
  USING (auth.uid() = "blockerId");

-- New messages reach an open panel live. Only where the publication exists: a
-- bare Postgres (CI's schema check) has no Realtime.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'direct_messages'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
  END IF;
END $$;
