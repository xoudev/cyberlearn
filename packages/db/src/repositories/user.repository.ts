import { prisma } from "../prisma.js";
import { classRepository } from "./class.repository.js";
import { friendshipRepository } from "./friendship.repository.js";

export const userRepository = {
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
   */
  async upsertFromAuth(input: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  }) {
    const profile = await prisma.user.upsert({
      where: { id: input.id },
      create: input,
      update: {
        email: input.email,
        lastActiveAt: new Date(),
        ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
      },
      select: { username: true, role: true },
    });

    try {
      await classRepository.redeemInvitationsForEmail(input.id, input.email);
    } catch (error) {
      console.error("[auth] class invitation redemption failed:", error);
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
      },
    });
    if (!user) return null;
    if (user.preferences?.publicProfile !== false) return user;
    if (viewerId === null) return null;
    if (viewerId === user.id) return user;

    const friendship = await friendshipRepository.between(viewerId, user.id);
    return friendship?.status === "ACCEPTED" ? user : null;
  },
};
