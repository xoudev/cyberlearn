import { orderPair } from "@cyberlearn/lib";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

/**
 * Asking, accepting, declining, and letting go.
 *
 * Every read and every write goes through orderPair, so the pair is looked up
 * the same way it was stored. The unique constraint on the ordered pair is what
 * actually holds the rule - two people who ask each other at the same instant
 * produce one row and one loser, and the loser is handled rather than crashed.
 */

/** Enough of the other person to put them in a list. */
const PERSON = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  level: true,
  xpTotal: true,
} as const satisfies Prisma.UserSelect;

export type FriendPerson = Prisma.UserGetPayload<{ select: typeof PERSON }>;

export interface FriendEdge {
  id: string;
  status: "PENDING" | "ACCEPTED";
  requestedById: string;
  createdAt: Date;
  /** The person on the other side, from the caller's point of view. */
  person: FriendPerson;
}

const EDGE = {
  id: true,
  userAId: true,
  userBId: true,
  requestedById: true,
  status: true,
  createdAt: true,
  userA: { select: PERSON },
  userB: { select: PERSON },
} as const satisfies Prisma.FriendshipSelect;

type EdgeRow = Prisma.FriendshipGetPayload<{ select: typeof EDGE }>;

/** One row, turned round so "person" is always the one who is not the viewer. */
function asEdge(row: EdgeRow, viewerId: string): FriendEdge {
  return {
    id: row.id,
    status: row.status,
    requestedById: row.requestedById,
    createdAt: row.createdAt,
    person: row.userAId === viewerId ? row.userB : row.userA,
  };
}

/** A unique-constraint violation, which here means "somebody got there first". */
function isDuplicate(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

export type RequestResult =
  | { ok: true; status: "PENDING" | "ACCEPTED" }
  | { ok: false; reason: "SELF" | "ALREADY" | "BLOCKED" };

export const friendshipRepository = {
  /** The row between two people, whichever way round they are given. */
  async between(one: string, other: string) {
    const pair = orderPair(one, other);
    if (pair === null) return null;
    return prisma.friendship.findUnique({
      where: { userAId_userBId: pair },
      select: { id: true, status: true, requestedById: true, createdAt: true },
    });
  },

  /**
   * Asks somebody to be friends - or, if they have already asked, agrees.
   *
   * That second case is the one worth writing down. Somebody who opens a
   * profile, sees "add as friend" and presses it, while the other person is
   * doing the same, means yes. Creating a second row instead - or refusing
   * because a row exists - would be technically defensible and would read, to
   * both of them, as the button being broken.
   */
  async request(requesterId: string, targetId: string): Promise<RequestResult> {
    const pair = orderPair(requesterId, targetId);
    if (pair === null) return { ok: false, reason: "SELF" };

    const existing = await prisma.friendship.findUnique({
      where: { userAId_userBId: pair },
      select: { id: true, status: true, requestedById: true },
    });

    if (existing) {
      if (existing.status === "ACCEPTED") return { ok: false, reason: "ALREADY" };
      // They asked first: pressing the button is agreeing.
      if (existing.requestedById !== requesterId) {
        await prisma.friendship.updateMany({
          where: { id: existing.id, status: "PENDING" },
          data: { status: "ACCEPTED", respondedAt: new Date() },
        });
        return { ok: true, status: "ACCEPTED" };
      }
      return { ok: false, reason: "ALREADY" };
    }

    try {
      await prisma.friendship.create({
        data: { ...pair, requestedById: requesterId, status: "PENDING" },
      });
      return { ok: true, status: "PENDING" };
    } catch (error) {
      // The other person's request landed between the read and the write. The
      // constraint did its job; the friendly answer is still "yes".
      if (!isDuplicate(error)) throw error;
      const now = await prisma.friendship.findUnique({
        where: { userAId_userBId: pair },
        select: { requestedById: true },
      });
      if (now && now.requestedById !== requesterId) {
        await prisma.friendship.updateMany({
          where: { ...pair, status: "PENDING" },
          data: { status: "ACCEPTED", respondedAt: new Date() },
        });
        return { ok: true, status: "ACCEPTED" };
      }
      return { ok: false, reason: "ALREADY" };
    }
  },

  /**
   * Says yes to a request.
   *
   * Only the person who was asked can: the PENDING condition and the
   * requestedById check together mean the person who sent it cannot accept
   * their own request by calling this with the ids the other way round.
   */
  async accept(accepterId: string, otherId: string): Promise<boolean> {
    const pair = orderPair(accepterId, otherId);
    if (pair === null) return false;
    const result = await prisma.friendship.updateMany({
      where: {
        ...pair,
        status: "PENDING",
        requestedById: { not: accepterId },
      },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });
    return result.count > 0;
  },

  /**
   * Says no, or takes back an ask, or ends a friendship.
   *
   * All three delete the row, and deliberately so. A declined request kept as a
   * tombstone silently stops the pair ever asking again, and somebody who said
   * no in March being unable to say yes in June is a bug nobody would find.
   */
  async remove(actorId: string, otherId: string): Promise<boolean> {
    const pair = orderPair(actorId, otherId);
    if (pair === null) return false;
    // Only a side can remove, and that is enforced by construction rather than
    // by a clause: the pair is built from actorId, so a row that matches it has
    // actorId on one end. Somebody naming two other people deletes nothing,
    // because the pair they name is not the pair that exists.
    //
    // An OR on actorId here would read like the check and would be dead - it
    // cannot exclude a row that the pair already matched. Defensive code that
    // looks load-bearing and is not is worse than none: the next person to
    // change this signature would trust it.
    const result = await prisma.friendship.deleteMany({ where: pair });
    return result.count > 0;
  },

  /** Somebody's friends, most recently agreed first. */
  async listFriends(userId: string, limit = 200): Promise<FriendEdge[]> {
    const rows = await prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ userAId: userId }, { userBId: userId }] },
      orderBy: { respondedAt: "desc" },
      take: limit,
      select: EDGE,
    });
    return rows.map((row) => asEdge(row, userId));
  },

  /** Requests waiting on this person's answer, oldest first. */
  async listIncoming(userId: string, limit = 100): Promise<FriendEdge[]> {
    const rows = await prisma.friendship.findMany({
      where: {
        status: "PENDING",
        requestedById: { not: userId },
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: EDGE,
    });
    return rows.map((row) => asEdge(row, userId));
  },

  /** Requests this person has sent and nobody has answered yet. */
  async listOutgoing(userId: string, limit = 100): Promise<FriendEdge[]> {
    const rows = await prisma.friendship.findMany({
      where: { status: "PENDING", requestedById: userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: EDGE,
    });
    return rows.map((row) => asEdge(row, userId));
  },

  /** How many requests are waiting - for the badge on the menu entry. */
  async countIncoming(userId: string): Promise<number> {
    return prisma.friendship.count({
      where: {
        status: "PENDING",
        requestedById: { not: userId },
        OR: [{ userAId: userId }, { userBId: userId }],
      },
    });
  },
};
