import { randomUUID } from "node:crypto";
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

const CLASS_PLACE = {
  id: true,
  name: true,
  promotion: { select: { name: true, establishment: { select: { name: true } } } },
} as const satisfies Prisma.ClassSelect;

/** One account as its page in the console reads it: who it is and what it set. */
const CONSOLE_PROFILE = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  role: true,
  level: true,
  xpTotal: true,
  streakDays: true,
  longestStreak: true,
  streakFreezes: true,
  createdAt: true,
  lastActiveAt: true,
  preferences: {
    select: {
      theme: true,
      emailNotifications: true,
      spacedRepetition: true,
      reviewReminders: true,
      weeklyDigest: true,
      streakReminder: true,
      publicProfile: true,
      leaderboardVisibility: true,
      friendsLeaderboard: true,
      learningGoals: true,
      startingLevel: true,
    },
  },
  placementResult: {
    select: { devScore: true, cybersecScore: true, networkScore: true, completedAt: true },
  },
  _count: {
    select: {
      badges: true,
      certificates: { where: { revokedAt: null } },
      questions: true,
      answers: true,
      skipWaivers: { where: { grantReason: "placement_test" } },
    },
  },
  classMemberships: { select: { class: { select: CLASS_PLACE } } },
  taughtClasses: { select: { subject: true, class: { select: CLASS_PLACE } } },
} as const satisfies Prisma.UserSelect;

export type ConsoleProfile = Prisma.UserGetPayload<{ select: typeof CONSOLE_PROFILE }>;

/** The profile fields the console edits, and the avatar it can only clear. */
export type ConsoleProfileField = "displayName" | "username" | "bio" | "avatar";

export type ConsoleProfileUpdate =
  | { ok: true; changed: Exclude<ConsoleProfileField, "avatar">[] }
  | { ok: false; reason: "NOT_FOUND" | "USERNAME_TAKEN" | "USERNAME_REQUIRED" };

export type ConsoleProfileReset =
  | {
      ok: true;
      /** What the field holds now. */
      value: string | null;
      /** The avatar the reset cleared, for the caller to remove its file. */
      clearedAvatar: string | null;
    }
  | { ok: false; reason: "NOT_FOUND" | "UNCHANGED" | "NO_USERNAME" | "USERNAME_TAKEN" };

/** The audit actions of the console's gestures on a profile and its sessions. */
export const CONSOLE_PROFILE_ACTION = {
  update: "admin.user.profile.update",
  reset: "admin.user.profile.reset",
  sessionsRevoked: "admin.user.sessions.revoked",
} as const;

/** Tries before a generated handle is given up on: each one is new. */
const GENERATED_USERNAME_TRIES = 5;

/**
 * A handle nobody chose, for an account whose own the console reset:
 * "utilisateur-" and eight hex characters, inside the rules of usernameSchema.
 */
export function generatedUsername(): string {
  return `utilisateur-${randomUUID().slice(0, 8)}`;
}

/** A unique-constraint violation: somebody took the handle between the check and the write. */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

/** What the console's quick search shows of an account: enough to tell two apart. */
const CONSOLE_USER_HIT = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  role: true,
} as const satisfies Prisma.UserSelect;

export type ConsoleUserHit = Prisma.UserGetPayload<{ select: typeof CONSOLE_USER_HIT }>;

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

/**
 * How a profile opens for its reader: not at all, as a public profile, or as
 * a private one the reader was let into (their own, or an accepted friend's).
 */
export type ProfileAccess = "closed" | "public" | "private";

/** What a public profile's link preview names: nothing a stranger could not read on it. */
export interface ProfilePreviewCard {
  username: string;
  displayName: string;
  xpTotal: number;
  streakDays: number;
  badges: number;
}

/**
 * Whether this reader may open this person's profile: a public one, their
 * own, or an accepted friend's. The one rule behind findPublicProfile and
 * isProfileOpenTo, so the light check and the full read never disagree.
 */
async function profileOpensTo(
  owner: { id: string; preferences: { publicProfile: boolean } | null },
  viewerId: string | null,
): Promise<boolean> {
  if (owner.preferences?.publicProfile !== false) return true;
  if (viewerId === null) return false;
  if (viewerId === owner.id) return true;
  return (await friendshipRepository.between(viewerId, owner.id))?.status === "ACCEPTED";
}

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
        // Every badge, not the dozen the page lists (listedBadges cuts it
        // where it is drawn): the app's profile has always received them all,
        // and an app already installed counts them off this list.
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
        // The lists above stop at a few rows; the figures are counted. The
        // strip used to print the lists' lengths, so nobody had more than 10
        // lessons or 30 challenges.
        _count: {
          select: {
            badges: true,
            lessonProgress: { where: { status: "COMPLETED" } },
            challengeProgress: { where: { status: "COMPLETED" } },
            certificates: { where: { revokedAt: null } },
            pathProgress: { where: { status: "COMPLETED" } },
          },
        },
      },
    });
    if (!user) return null;
    if (!(await profileOpensTo(user, viewerId))) return null;

    // The skills line counts lessons finished by category: a count per
    // category, rather than every row of a long progress.
    const counted = await prisma.lesson.groupBy({
      by: ["category"],
      where: { progress: { some: { userId: user.id, status: "COMPLETED" } } },
      _count: { _all: true },
    });
    const { _count: count, ...profile } = user;
    return {
      ...profile,
      lessonsByCategory: counted.map((row) => ({ category: row.category, count: row._count._all })),
      counts: {
        badges: count.badges,
        lessons: count.lessonProgress,
        challenges: count.challengeProgress,
        certificates: count.certificates,
        paths: count.pathProgress,
      },
    };
  },

  /**
   * How /u/<username> opens for this reader: "closed" when it does not (no
   * such account, or a private one the reader is not let into - the two are
   * not told apart), otherwise whether it is public or a private profile the
   * reader was let into. The id and the setting, then the friendship only for
   * a private one: the layout's and the metadata's light question, which
   * also decides whether search engines may index the page.
   */
  async profileAccess(username: string, viewerId: string | null): Promise<ProfileAccess> {
    const owner = await prisma.user.findUnique({
      where: { username },
      select: { id: true, preferences: { select: { publicProfile: true } } },
    });
    if (owner === null || !(await profileOpensTo(owner, viewerId))) return "closed";
    return owner.preferences?.publicProfile === false ? "private" : "public";
  },

  /**
   * A profile's link preview, as anybody receives it: a shared link is read
   * by whoever it is pasted to, and by crawlers, never as a friend. Null for
   * a missing or private profile, which previews without a name.
   */
  async findPreviewCard(username: string): Promise<ProfilePreviewCard | null> {
    const owner = await prisma.user.findUnique({
      where: { username },
      select: {
        username: true,
        displayName: true,
        xpTotal: true,
        streakDays: true,
        preferences: { select: { publicProfile: true } },
        _count: { select: { badges: true } },
      },
    });
    if (owner?.username == null || owner.preferences?.publicProfile === false) return null;
    return {
      username: owner.username,
      displayName: owner.displayName,
      xpTotal: owner.xpTotal,
      streakDays: owner.streakDays,
      badges: owner._count.badges,
    };
  },

  /**
   * Whether findPublicProfile would return something for this reader, without
   * reading the profile: the id and the "profil public" setting, then the
   * friendship only for a private one.
   *
   * For /u/<username>'s layout, which has to answer the 404 before anything is
   * streamed and so runs above the skeleton - which is also where Next stops
   * when it prefetches a link. Every profile link on a screen (the leaderboard,
   * the forum) prefetches, so the layout's question has to stay this cheap;
   * the full read stays in the page, behind the skeleton.
   */
  async isProfileOpenTo(username: string, viewerId: string | null): Promise<boolean> {
    return (await userRepository.profileAccess(username, viewerId)) !== "closed";
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

  /**
   * The few accounts the console's quick search offers for a term: the same
   * match as the list's search box, the most recently active first, since the
   * account someone is looking for is usually one that just did something.
   * An empty term matches nothing rather than everyone.
   */
  async searchForConsole(q: string, take: number): Promise<ConsoleUserHit[]> {
    if (q.trim().replace(/^@/u, "") === "") return [];
    return prisma.user.findMany({
      where: consoleUserWhere(q, undefined),
      orderBy: [{ lastActiveAt: "desc" }, { id: "asc" }],
      take,
      select: CONSOLE_USER_HIT,
    });
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

  /** The administrators, by name: who a ticket can be given to. */
  async listAdmins() {
    return prisma.user.findMany({
      where: { role: "ADMIN" },
      orderBy: { displayName: "asc" },
      select: { id: true, username: true, displayName: true },
    });
  },

  /**
   * One account for its page in the console: identity, counters, settings,
   * placement test and classes, in one read. The page used to query Prisma
   * itself, and read neither the bio nor the settings.
   */
  async findConsoleProfile(userId: string): Promise<ConsoleProfile | null> {
    return prisma.user.findUnique({ where: { id: userId }, select: CONSOLE_PROFILE });
  },

  /**
   * Signs the account out everywhere: every session Supabase Auth holds for
   * it, on the site, the app and the console alike. Returns how many there
   * were.
   *
   * A statement on auth.sessions rather than a call to Supabase: its admin
   * signOut takes the user's own token, which the console never holds. The
   * refresh tokens go with their sessions, by the cascade on their foreign
   * key, so no client can renew one. The site and the app check the session
   * on every request (getUser), and stop at the next one; a token already
   * issued is still accepted by the Data API until it expires, an hour at most.
   *
   * The audit row is written in the same transaction: the sessions and their
   * trace go together or not at all.
   */
  async revokeAllSessions(userId: string, by: { actorId: string }): Promise<number> {
    return prisma.$transaction(async (tx) => {
      const revoked =
        await tx.$executeRaw`DELETE FROM auth.sessions WHERE user_id = ${userId}::uuid`;
      await tx.auditLog.create({
        data: {
          actorId: by.actorId,
          action: CONSOLE_PROFILE_ACTION.sessionsRevoked,
          targetType: "User",
          targetId: userId,
          metadata: { sessionsRevoked: revoked },
        },
      });
      return revoked;
    });
  },

  /**
   * The name shown, the handle and the bio, as an administrator corrected
   * them. The bounds are the caller's (the same as the site's forms); the
   * handle being free is checked here, in the transaction that writes it, and
   * the unique index settles a race.
   *
   * An account that has a handle keeps one: `username: null` is accepted only
   * from an account still in onboarding, which has none yet. Nothing changed
   * writes nothing, to the account or to the log.
   */
  async updateProfileFromConsole(
    userId: string,
    input: { displayName: string; username: string | null; bio: string | null },
    by: { actorId: string },
  ): Promise<ConsoleProfileUpdate> {
    try {
      return await prisma.$transaction(async (tx): Promise<ConsoleProfileUpdate> => {
        const before = await tx.user.findUnique({
          where: { id: userId },
          select: { username: true, displayName: true, bio: true },
        });
        if (before === null) return { ok: false, reason: "NOT_FOUND" };
        if (input.username === null && before.username !== null) {
          return { ok: false, reason: "USERNAME_REQUIRED" };
        }

        const changed: Exclude<ConsoleProfileField, "avatar">[] = [];
        if (input.displayName !== before.displayName) changed.push("displayName");
        if (input.username !== before.username) changed.push("username");
        if (input.bio !== before.bio) changed.push("bio");
        if (changed.length === 0) return { ok: true, changed };

        if (input.username !== null && input.username !== before.username) {
          const holder = await tx.user.findUnique({
            where: { username: input.username },
            select: { id: true },
          });
          if (holder !== null && holder.id !== userId) {
            return { ok: false, reason: "USERNAME_TAKEN" };
          }
        }

        await tx.user.update({
          where: { id: userId },
          data: { displayName: input.displayName, username: input.username, bio: input.bio },
        });
        await tx.auditLog.create({
          data: {
            actorId: by.actorId,
            action: CONSOLE_PROFILE_ACTION.update,
            targetType: "User",
            targetId: userId,
            // The fields are named, not copied: the log keeps who changed
            // what, not a second copy of somebody's name, handle or bio. A
            // copy would also outlive the account, since an erasure
            // pseudonymises the rows where it acted, not those about it.
            metadata: { fields: changed },
          },
        });
        return { ok: true, changed };
      });
    } catch (error) {
      if (isUniqueViolation(error)) return { ok: false, reason: "USERNAME_TAKEN" };
      throw error;
    }
  },

  /**
   * Puts one profile field back to what nobody chose: the name shown becomes
   * the handle, the handle a generated one, the bio and the avatar nothing.
   * For a name or a picture that should not be there, without having to type
   * a replacement for somebody.
   *
   * Returns the avatar it cleared, so the caller can remove an uploaded
   * picture's file: storage is not transactional, and a file that outlives
   * its row is a loose end to report, not a reason to keep the row.
   */
  async resetProfileFieldFromConsole(
    userId: string,
    field: ConsoleProfileField,
    by: { actorId: string },
    newUsername: () => string = generatedUsername,
  ): Promise<ConsoleProfileReset> {
    try {
      return await prisma.$transaction(async (tx): Promise<ConsoleProfileReset> => {
        const before = await tx.user.findUnique({
          where: { id: userId },
          select: { username: true, displayName: true, bio: true, avatarUrl: true },
        });
        if (before === null) return { ok: false, reason: "NOT_FOUND" };

        let data: Prisma.UserUpdateInput;
        let value: string | null = null;
        switch (field) {
          case "displayName": {
            if (before.username === null) return { ok: false, reason: "NO_USERNAME" };
            if (before.displayName === before.username) return { ok: false, reason: "UNCHANGED" };
            value = before.username;
            data = { displayName: value };
            break;
          }
          case "username": {
            if (before.username === null) return { ok: false, reason: "NO_USERNAME" };
            for (let attempt = 0; attempt < GENERATED_USERNAME_TRIES && value === null; attempt++) {
              const candidate = newUsername();
              const holder = await tx.user.findUnique({
                where: { username: candidate },
                select: { id: true },
              });
              if (holder === null) value = candidate;
            }
            if (value === null) return { ok: false, reason: "USERNAME_TAKEN" };
            data = { username: value };
            break;
          }
          case "bio": {
            if (before.bio === null) return { ok: false, reason: "UNCHANGED" };
            data = { bio: null };
            break;
          }
          case "avatar": {
            if (before.avatarUrl === null) return { ok: false, reason: "UNCHANGED" };
            data = { avatarUrl: null };
            break;
          }
        }

        await tx.user.update({ where: { id: userId }, data });
        await tx.auditLog.create({
          data: {
            actorId: by.actorId,
            action: CONSOLE_PROFILE_ACTION.reset,
            targetType: "User",
            targetId: userId,
            // The field alone, as for an update: neither the old name, handle
            // or picture, nor the new value (a handle is still a name).
            metadata: { field },
          },
        });
        return {
          ok: true,
          value,
          clearedAvatar: field === "avatar" ? before.avatarUrl : null,
        };
      });
    } catch (error) {
      if (isUniqueViolation(error)) return { ok: false, reason: "USERNAME_TAKEN" };
      throw error;
    }
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
