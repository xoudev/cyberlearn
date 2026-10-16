import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../prisma.js";
import { classRepository } from "./class.repository.js";
import { readSlice, type ConsolePage, type ConsoleSlice, type SortDir } from "./console-page.js";
import { friendshipRepository } from "./friendship.repository.js";

import { logger, errorMessage } from "@cyberlearn/lib/logger";

/** What a role change did, or the reason it did nothing. */
export type ChangeRoleResult =
  | { ok: true; previousRole: UserRole }
  | { ok: false; reason: "NOT_FOUND" | "LAST_ADMIN" };

/** The audit action every role change writes, read back by heldAdminRoleSince. */
const ROLE_UPDATE_ACTION = "user.role.update";

/** The columns the console's account list sorts by. */
export type ConsoleUserSort =
  | "user"
  | "email"
  | "role"
  | "level"
  | "xp"
  | "streak"
  | "badges"
  | "created"
  | "active";

export interface ConsoleUserQuery extends ConsolePage {
  /** Part of an address, a @pseudo or a display name; empty for none. */
  q: string;
  role: UserRole | undefined;
  sort: { key: ConsoleUserSort; dir: SortDir };
}

const CONSOLE_USER_ROW = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  role: true,
  level: true,
  xpTotal: true,
  streakDays: true,
  createdAt: true,
  lastActiveAt: true,
  _count: {
    select: {
      badges: true,
      certificates: { where: { revokedAt: null } },
    },
  },
} as const satisfies Prisma.UserSelect;

export type ConsoleUserRow = Prisma.UserGetPayload<{ select: typeof CONSOLE_USER_ROW }>;

/**
 * The order of each sortable column. The id comes last everywhere: rows that
 * tie (a hundred accounts at level 1) would otherwise trade places between two
 * pages, and one could show up twice while another never shows.
 *
 * No column sorts by certificates: the list counts the ones still valid, and
 * the database can only order by all of them, revoked included. A sort that
 * disagrees with the number on screen is worse than none.
 */
function consoleUserOrder(
  key: ConsoleUserSort,
  dir: SortDir,
): Prisma.UserOrderByWithRelationInput[] {
  const tieBreak: Prisma.UserOrderByWithRelationInput = { id: "asc" };
  switch (key) {
    case "user":
      // A handle when there is one, the display name until onboarding gives one.
      return [{ username: { sort: dir, nulls: "last" } }, { displayName: dir }, tieBreak];
    case "email":
      return [{ email: dir }, tieBreak];
    case "role":
      // The enum is declared STUDENT, TEACHER, ADMIN, and the console reads
      // roles most privileged first: ascending there is descending here.
      return [{ role: dir === "asc" ? "desc" : "asc" }, tieBreak];
    case "level":
      return [{ level: dir }, tieBreak];
    case "xp":
      return [{ xpTotal: dir }, tieBreak];
    case "streak":
      return [{ streakDays: dir }, tieBreak];
    case "badges":
      return [{ badges: { _count: dir } }, tieBreak];
    case "created":
      return [{ createdAt: dir }, tieBreak];
    case "active":
      return [{ lastActiveAt: dir }, tieBreak];
  }
}

/**
 * The accounts a console search matches. A leading @ is dropped, so "@amelie"
 * finds the handle the list prints that way.
 */
export function consoleUserWhere(q: string, role: UserRole | undefined): Prisma.UserWhereInput {
  const term = q.trim().replace(/^@/u, "");
  const terms: Prisma.UserWhereInput[] = [];
  if (role !== undefined) terms.push({ role });
  if (term !== "") {
    terms.push({
      OR: [
        { email: { contains: term, mode: "insensitive" } },
        { username: { contains: term, mode: "insensitive" } },
        { displayName: { contains: term, mode: "insensitive" } },
      ],
    });
  }
  return { AND: terms };
}

const WEEK_MS = 7 * 86_400_000;

export const userRepository = {
  /**
   * Changes an account's role, and never leaves the console without an
   * administrator.
   *
   * The gate is here, in the transaction that writes the role, rather than in
   * the action that calls it. Counting the administrators and then updating
   * leaves a gap: two administrators demoting each other at the same moment
   * would each count two, each succeed, and nobody could open the console
   * again. Every ADMIN row is locked first, so the second demotion waits for
   * the first and then counts what the first one left.
   *
   * The audit row is written in the same transaction as the role. A change of
   * privilege with no trace is the one thing the log exists to rule out, and
   * an audit write that failed after the update had committed would leave
   * exactly that. Now both land or neither does.
   *
   * Setting the role an account already has is not an error, and writes
   * nothing, to the account or to the log.
   */
  async changeRole(
    userId: string,
    role: UserRole,
    by: { actorId: string },
  ): Promise<ChangeRoleResult> {
    return prisma.$transaction(async (tx): Promise<ChangeRoleResult> => {
      const admins = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "users" WHERE "role" = 'ADMIN' FOR UPDATE`;
      const target = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (target === null) return { ok: false, reason: "NOT_FOUND" };
      if (target.role === role) return { ok: true, previousRole: target.role };
      if (target.role === "ADMIN" && admins.length <= 1) {
        return { ok: false, reason: "LAST_ADMIN" };
      }
      await tx.user.update({ where: { id: userId }, data: { role } });
      await tx.auditLog.create({
        data: {
          actorId: by.actorId,
          action: ROLE_UPDATE_ACTION,
          targetType: "User",
          targetId: userId,
          metadata: { newRole: role, previousRole: target.role },
        },
      });
      return { ok: true, previousRole: target.role };
    });
  },

  /**
   * Whether the account held the ADMIN role at any point since `since`, as far
   * as the audit log can tell: a change that made it an administrator, or one
   * that took the role away, in that span.
   *
   * The console refuses to reset an administrator's second factor. Without
   * this, three gestures from one stolen admin session would get round it:
   * demote the administrator, reset the factor of what is now a learner,
   * promote them back, and enrol a new factor with the phished password alone.
   * The demotion is in the log, with the role it replaced, and that is what
   * keeps the reset refused.
   */
  async heldAdminRoleSince(userId: string, since: Date): Promise<boolean> {
    const change = await prisma.auditLog.findFirst({
      where: {
        action: ROLE_UPDATE_ACTION,
        targetType: "User",
        targetId: userId,
        createdAt: { gte: since },
        OR: [
          { metadata: { path: ["previousRole"], equals: "ADMIN" } },
          { metadata: { path: ["newRole"], equals: "ADMIN" } },
        ],
      },
      select: { id: true },
    });
    return change !== null;
  },

  /**
   * Creates or refreshes the application profile associated with a Supabase
   * identity, and takes up any class invitation waiting on the address.
   *
   * Redemption lives here rather than in a sign-in route because this is the
   * one place a profile is provisioned, and a route that forgot to call it
   * would leave someone invited forever - looking at a product that never
   * mentions the class they were told they were in. It is a single indexed
   * probe that returns nothing for almost everyone, and it is on the sign-in
   * path, so it stays a probe: no mail, no second round trip.
   *
   * Its failure is swallowed. An invitation is a courtesy; being unable to
   * redeem one is not a reason to refuse somebody their session.
   *
   * The identity's picture (GitHub's, for a linked account) fills an avatar
   * that is still empty and nothing more. It used to be written at every
   * sign-in, over whatever the learner had picked at sign-up or uploaded since:
   * their choice lasted until the next time they signed in.
   */
  async upsertFromAuth(input: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  }) {
    const { avatarUrl: storedAvatar, ...profile } = await prisma.user.upsert({
      where: { id: input.id },
      create: input,
      update: {
        email: input.email,
        lastActiveAt: new Date(),
      },
      select: { username: true, role: true, avatarUrl: true },
    });

    // Only when there is something to fill, which is rare once a profile
    // exists, and guarded in the statement so a choice made in between stands.
    if (input.avatarUrl && storedAvatar === null) {
      await prisma.user.updateMany({
        where: { id: input.id, avatarUrl: null },
        data: { avatarUrl: input.avatarUrl },
      });
    }

    try {
      await classRepository.redeemInvitationsForEmail(input.id, input.email);
    } catch (error) {
      logger.error(
        { scope: "auth", err: errorMessage(error) },
        "class invitation redemption failed",
      );
    }

    return profile;
  },

  /** Role lookup used by authenticated server guards. */
  async findRoleById(userId: string) {
    return prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  },

  /** Role lookup used before an admin password session is accepted. */
  async findRoleByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, select: { role: true } });
  },

  /** Minimal user data needed for XP + streak computation on lesson completion. */
  async findForGamification(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        xpTotal: true,
        level: true,
        streakDays: true,
        longestStreak: true,
        streakFreezes: true,
        lastActiveAt: true,
      },
    });
  },

  /** Full profile data for authenticated user's own profile page. */
  async findProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        badges: {
          include: { badge: true },
          orderBy: { earnedAt: "desc" },
        },
        lessonProgress: {
          where: { status: "COMPLETED" },
          select: {
            lessonId: true,
            completedAt: true,
            lesson: { select: { title: true, slug: true, category: true, xpReward: true } },
          },
          orderBy: { completedAt: "desc" },
          take: 20,
        },
      },
    });
  },

  /**
   * A profile as somebody else reads it.
   *
   * "Profil public" off closes the page to the platform - but a friend is not
   * the platform. Everywhere else, a private profile means "the people I
   * accepted, and nobody else"; here it used to mean "nobody", which turned
   * every link the friends panel draws into a 404 and left a friendship with
   * nothing behind it. A friendship is two-sided - one asked, the other said
   * yes - so it is the one relation that can open this page without anybody
   * being shown to someone they did not agree to.
   *
   * A pending request opens nothing. Asking is not being accepted, and a
   * stranger who could read a private profile by pressing "ajouter" would have
   * turned the setting off for everyone.
   *
   * Returns null when there is no such user, or when the viewer may not read
   * it - the caller cannot tell the two apart, and should not: "this account
   * is private" and "there is no such account" leak the same thing.
   */
  async findPublicProfile(username: string, viewerId: string | null = null) {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        preferences: { select: { publicProfile: true } },
        badges: {
          include: { badge: true },
          orderBy: { earnedAt: "desc" },
        },
        lessonProgress: {
          where: { status: "COMPLETED" },
          select: {
            completedAt: true,
            lesson: { select: { title: true, slug: true, category: true } },
          },
          orderBy: { completedAt: "desc" },
          take: 10,
        },
        // The portfolio: what is finished, and what proves it.
        pathProgress: {
          where: { status: "COMPLETED" },
          select: {
            completedAt: true,
            path: { select: { title: true, slug: true, category: true } },
          },
          orderBy: { completedAt: "desc" },
        },
        certificates: {
          where: { revokedAt: null },
          select: {
            publicId: true,
            issuedAt: true,
            score: true,
            path: { select: { title: true, slug: true, category: true } },
          },
          orderBy: { issuedAt: "desc" },
        },
        challengeProgress: {
          where: { status: "COMPLETED" },
          select: {
            completedAt: true,
            challenge: { select: { title: true, slug: true, difficulty: true, category: true } },
          },
          orderBy: { completedAt: "desc" },
          take: 30,
        },
      },
    });
    if (!user) return null;
    let allowed = user.preferences?.publicProfile !== false;
    if (!allowed && viewerId !== null) {
      allowed =
        viewerId === user.id ||
        (await friendshipRepository.between(viewerId, user.id))?.status === "ACCEPTED";
    }
    if (!allowed) return null;

    // The skills line counts lessons finished by category: a count per
    // category, rather than every row of a long progress.
    const counted = await prisma.lesson.groupBy({
      by: ["category"],
      where: { progress: { some: { userId: user.id, status: "COMPLETED" } } },
      _count: { _all: true },
    });
    return {
      ...user,
      lessonsByCategory: counted.map((row) => ({ category: row.category, count: row._count._all })),
    };
  },

  /**
   * Which of these people's profiles the viewer would be let into: the rule
   * of findPublicProfile (public, their own, or an accepted friend's), for a
   * page that names many people at once and links only the names that open.
   * A link that lands on a 404 is worse than a name that is not a link.
   *
   * Two reads at most, whatever the number of people: the preferences, then
   * the friendships of the private ones only.
   */
  async profilesOpenTo(viewerId: string, userIds: readonly string[]): Promise<Set<string>> {
    const open = new Set<string>();
    const ids = [...new Set(userIds)];
    if (ids.length === 0) return open;

    const people = await prisma.user.findMany({
      where: { id: { in: ids }, username: { not: null } },
      select: { id: true, preferences: { select: { publicProfile: true } } },
    });
    const closed: string[] = [];
    for (const person of people) {
      if (person.id === viewerId || person.preferences?.publicProfile !== false)
        open.add(person.id);
      else closed.push(person.id);
    }
    if (closed.length === 0) return open;

    const friendships = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [
          { userAId: viewerId, userBId: { in: closed } },
          { userBId: viewerId, userAId: { in: closed } },
        ],
      },
      select: { userAId: true, userBId: true },
    });
    for (const row of friendships) open.add(row.userAId === viewerId ? row.userBId : row.userAId);
    return open;
  },

  /**
   * One page of the console's account list, under its search and role filter.
   * The console used to load every account to filter them in the browser.
   */
  async listForConsole(query: ConsoleUserQuery): Promise<ConsoleSlice<ConsoleUserRow>> {
    const where = consoleUserWhere(query.q, query.role);
    return readSlice(
      query,
      () => prisma.user.count({ where }),
      ({ skip, take }) =>
        prisma.user.findMany({
          where,
          orderBy: consoleUserOrder(query.sort.key, query.sort.dir),
          skip,
          take,
          select: CONSOLE_USER_ROW,
        }),
    );
  },

  /** The figures above the account list, over every account whatever the filter. */
  async consoleCounts(now: Date): Promise<{ total: number; admins: number; activeWeek: number }> {
    const [total, admins, activeWeek] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { lastActiveAt: { gte: new Date(now.getTime() - WEEK_MS) } } }),
    ]);
    return { total, admins, activeWeek };
  },

  /**
   * Which of these auth ids already have a profile. A sign-up gets its row at
   * its first sign-in, so an address never confirmed has none.
   */
  async existingIds(ids: readonly string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const rows = await prisma.user.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true },
    });
    return new Set(rows.map((row) => row.id));
  },
};
