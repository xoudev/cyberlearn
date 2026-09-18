-- Two people, and whether they have agreed about it.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FRIEND_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FRIEND_ACCEPTED';

-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- CreateTable
CREATE TABLE "friendships" (
    "id" UUID NOT NULL,
    "userAId" UUID NOT NULL,
    "userBId" UUID NOT NULL,
    "requestedById" UUID NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);

-- One friendship per pair, in either direction. The ids are stored in order,
-- so this single constraint is the whole rule: two people who open each
-- other's profile at the same moment - which is exactly when this happens -
-- cannot end up with two friendships and no way to tell which one accepting
-- acts on.
CREATE UNIQUE INDEX "friendships_userAId_userBId_key" ON "friendships"("userAId", "userBId");

CREATE INDEX "friendships_userAId_status_idx" ON "friendships"("userAId", "status");
CREATE INDEX "friendships_userBId_status_idx" ON "friendships"("userBId", "status");
CREATE INDEX "friendships_requestedById_idx" ON "friendships"("requestedById");

-- The ordering is what makes the constraint above mean "this pair", so it is a
-- rule of the table rather than a convention in the repository. It also rules
-- out the degenerate row: nobody is their own friend.
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_ordered_pair" CHECK ("userAId" < "userBId");

-- Whoever asked has to be one of the two. Without this, a third party could be
-- recorded as the requester of somebody else's friendship.
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_is_party"
  CHECK ("requestedById" = "userAId" OR "requestedById" = "userBId");

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ─── Row level security ──────────────────────────────────────────────────────
-- A person reads the friendships they are part of, and nothing else. Who is
-- friends with whom is not public: the list is on somebody's own page, and a
-- pending request is a thing one person knows about the other.
--
-- Nothing here grants an insert, an update or a delete. Asking, accepting,
-- declining and unfriending all go through the application, which checks which
-- side is asking; the Data API cannot be used to make somebody your friend, to
-- accept on their behalf, or to remove a friendship you are not in.
ALTER TABLE "friendships" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "friendships_select_own" ON public.friendships FOR SELECT
  USING (
    public.current_user_role() = 'ADMIN'
    OR "userAId" = auth.uid()
    OR "userBId" = auth.uid()
  );
