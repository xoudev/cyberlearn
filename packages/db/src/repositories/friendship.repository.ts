import { friendshipView, orderPair, type FriendshipView } from "@cyberlearn/lib";
import {
  mergeFriendActivity,
  type FriendActivityMoment,
} from "@cyberlearn/lib/social/friend-activity";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { CATALOGUE_LESSON } from "./lesson.repository.js";
import { CATALOGUE_PATH } from "./path.repository.js";

/**
 * Asking, accepting, declining, and letting go.
 *
 * Every read and every write goes through orderPair, so the pair is looked up
 * the same way it was stored. The unique constraint on the ordered pair is what
 * actually holds the rule - two people who ask each other at the same instant
 * produce one row and one loser, and the loser is handled rather than crashed.
 */

/**
 * How many friendships a GDPR export lists, the most recent ones: the export
 * says so in its metadata (rgpd/build-export.ts).
 */
export const FRIENDSHIP_EXPORT_LIMIT = 1000;

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
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export type RequestResult =
  | { ok: true; status: "PENDING" | "ACCEPTED" }
  | { ok: false; reason: "SELF" | "ALREADY" | "BLOCKED" };

/** Who did it, on a moment of a friend's activity: enough to name and picture them. */
const ACTOR = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const satisfies Prisma.UserSelect;

export type FriendActor = Prisma.UserGetPayload<{ select: typeof ACTOR }>;

/** One moment of a friend's recent activity, with the friend it is about. */
export interface FriendActivityRow extends FriendActivityMoment {
  at: Date;
  friend: FriendActor;
}

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
   * Says no to a request, and to nothing else: the row goes only while it is
   * still PENDING and the other person sent it. What a notification's
   * "Refuser" calls, as that button can outlive its request: accepted from
   * the friends panel in the meantime, a remove() from the notification
   * would end the friendship it was never meant to touch.
   */
  async decline(declinerId: string, otherId: string): Promise<boolean> {
    const pair = orderPair(declinerId, otherId);
    if (pair === null) return false;
    const result = await prisma.friendship.deleteMany({
      where: { ...pair, status: "PENDING", requestedById: otherId },
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

  /**
   * Somebody's friends, most recently agreed first. Every one of them unless
   * a caller asks for fewer: the friends panel used to stop at sixty without
   * saying so, and the sixty-first friend was nowhere to be found.
   */
  async listFriends(userId: string, limit?: number): Promise<FriendEdge[]> {
    const rows = await prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ userAId: userId }, { userBId: userId }] },
      orderBy: { respondedAt: "desc" },
      ...(limit !== undefined ? { take: limit } : {}),
      select: EDGE,
    });
    return rows.map((row) => asEdge(row, userId));
  },

  /**
   * The ids of somebody's friends, and nothing else: what a page needs to put
   * a mark beside the names it already shows. The lists above read a whole
   * person per row; a page that only asks "is this one a friend" would pay for
   * avatars and levels it never draws.
   */
  async friendIds(userId: string): Promise<Set<string>> {
    const rows = await prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ userAId: userId }, { userBId: userId }] },
      select: { userAId: true, userBId: true },
    });
    return new Set(rows.map((row) => (row.userAId === userId ? row.userBId : row.userAId)));
  },

  /**
   * The reader's relation with each of the people named, as their buttons
   * read it (friendshipView): friends, a request sent, a request received.
   * Only the ones with a row come back - a person missing from the map is a
   * stranger - and only among the ids asked about, so a page that lists
   * thirty people reads thirty relations at most.
   */
  async viewsOf(userId: string, ids: readonly string[]): Promise<Map<string, FriendshipView>> {
    const others = [...new Set(ids)].filter((id) => id !== userId);
    const views = new Map<string, FriendshipView>();
    if (others.length === 0) return views;
    const rows = await prisma.friendship.findMany({
      where: {
        OR: [
          { userAId: userId, userBId: { in: others } },
          { userBId: userId, userAId: { in: others } },
        ],
      },
      select: { userAId: true, userBId: true, status: true, requestedById: true },
    });
    for (const row of rows) {
      views.set(row.userAId === userId ? row.userBId : row.userAId, friendshipView(row, userId));
    }
    return views;
  },

  /** Requests waiting on this person's answer, oldest first; all of them unless asked for fewer. */
  async listIncoming(userId: string, limit?: number): Promise<FriendEdge[]> {
    const rows = await prisma.friendship.findMany({
      where: {
        status: "PENDING",
        requestedById: { not: userId },
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      orderBy: { createdAt: "asc" },
      ...(limit !== undefined ? { take: limit } : {}),
      select: EDGE,
    });
    return rows.map((row) => asEdge(row, userId));
  },

  /** Requests this person has sent and nobody has answered yet; all of them unless asked for fewer. */
  async listOutgoing(userId: string, limit?: number): Promise<FriendEdge[]> {
    const rows = await prisma.friendship.findMany({
      where: { status: "PENDING", requestedById: userId },
      orderBy: { createdAt: "desc" },
      ...(limit !== undefined ? { take: limit } : {}),
      select: EDGE,
    });
    return rows.map((row) => asEdge(row, userId));
  },

  /**
   * What the reader's accepted friends did lately, most recent first: the
   * dashboard's "Tes amis". No table of its own - it is read off the tables
   * the moments already live in, each source bounded at `limit` and most
   * recent first, so the merge of their heads is the true head
   * (mergeFriendActivity).
   *
   * Only what a friend's profile already shows the reader: catalogue lessons
   * (a class's own lesson would say which class somebody is in), badges,
   * certificates still valid, challenges solved, and duels a friend won on a
   * catalogue path - the winner only, so the loser, who may be a stranger to
   * the reader, is never named. A pending request is not a friendship and
   * reads nothing.
   *
   * `friendIds`, when the caller has already read them (friendIds), saves
   * reading them again.
   */
  async recentFriendActivity(
    userId: string,
    limit: number,
    friendIds?: ReadonlySet<string>,
  ): Promise<FriendActivityRow[]> {
    const friends = [...(friendIds ?? (await friendshipRepository.friendIds(userId)))];
    if (friends.length === 0 || limit <= 0) return [];
    const among = { in: friends };

    const [lessons, badges, certificates, challenges, duels] = await Promise.all([
      prisma.userLessonProgress.findMany({
        where: {
          userId: among,
          status: "COMPLETED",
          completedAt: { not: null },
          lesson: CATALOGUE_LESSON,
        },
        orderBy: { completedAt: "desc" },
        take: limit,
        select: {
          id: true,
          completedAt: true,
          lesson: { select: { title: true } },
          user: { select: ACTOR },
        },
      }),
      prisma.userBadge.findMany({
        where: { userId: among },
        orderBy: { earnedAt: "desc" },
        take: limit,
        select: {
          id: true,
          earnedAt: true,
          badge: { select: { name: true } },
          user: { select: ACTOR },
        },
      }),
      prisma.certificate.findMany({
        where: { userId: among, revokedAt: null, path: CATALOGUE_PATH },
        orderBy: { issuedAt: "desc" },
        take: limit,
        select: {
          id: true,
          issuedAt: true,
          path: { select: { title: true } },
          user: { select: ACTOR },
        },
      }),
      prisma.userChallengeProgress.findMany({
        where: { userId: among, status: "COMPLETED", completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
        take: limit,
        select: {
          id: true,
          completedAt: true,
          challenge: { select: { title: true } },
          user: { select: ACTOR },
        },
      }),
      prisma.duel.findMany({
        where: {
          status: "FINISHED",
          finishedAt: { not: null },
          winnerId: among,
          path: CATALOGUE_PATH,
          // Implied by the winner, said for the (challengerId, status) and
          // (opponentId, status) indexes: winnerId has none.
          OR: [{ challengerId: among }, { opponentId: among }],
        },
        orderBy: { finishedAt: "desc" },
        take: limit,
        select: {
          id: true,
          finishedAt: true,
          winnerId: true,
          path: { select: { title: true } },
          challenger: { select: ACTOR },
          opponent: { select: ACTOR },
        },
      }),
    ]);

    const rows: FriendActivityRow[][] = [
      lessons.flatMap((row) =>
        row.completedAt === null
          ? []
          : [
              {
                kind: "lesson" as const,
                key: `lesson:${row.id}`,
                at: row.completedAt,
                title: row.lesson.title,
                friend: row.user,
              },
            ],
      ),
      badges.map((row) => ({
        kind: "badge" as const,
        key: `badge:${row.id}`,
        at: row.earnedAt,
        title: row.badge.name,
        friend: row.user,
      })),
      certificates.flatMap((row) =>
        row.user === null
          ? []
          : [
              {
                kind: "certificate" as const,
                key: `certificate:${row.id}`,
                at: row.issuedAt,
                title: row.path.title,
                friend: row.user,
              },
            ],
      ),
      challenges.flatMap((row) =>
        row.completedAt === null
          ? []
          : [
              {
                kind: "challenge" as const,
                key: `challenge:${row.id}`,
                at: row.completedAt,
                title: row.challenge.title,
                friend: row.user,
              },
            ],
      ),
      duels.flatMap((row) => {
        const winner = row.winnerId === row.challenger.id ? row.challenger : row.opponent;
        if (row.finishedAt === null || winner.id !== row.winnerId) return [];
        return [
          {
            kind: "duel" as const,
            key: `duel:${row.id}`,
            at: row.finishedAt,
            title: row.path.title,
            friend: winner,
          },
        ];
      }),
    ];
    return mergeFriendActivity(rows, limit);
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

  /**
   * The account's friendships, requests included (sent and received), most
   * recent first, for its GDPR export (rgpd/build-export.ts).
   *
   * The other person is read by their username and nothing else: no e-mail,
   * no name, no level. Their ids are read to tell which side is the account's
   * and never reach the file. The cut is a number of friendships, and the
   * export says so in its metadata.
   */
  async exportFor(userId: string) {
    return prisma.friendship.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      select: {
        userAId: true,
        requestedById: true,
        status: true,
        createdAt: true,
        respondedAt: true,
        userA: { select: { username: true } },
        userB: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: FRIENDSHIP_EXPORT_LIMIT,
    });
  },
};
