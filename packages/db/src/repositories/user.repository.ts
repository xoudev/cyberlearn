import { prisma } from "../prisma.js";

export const userRepository = {
  /** Creates or refreshes the application profile associated with a Supabase identity. */
  async upsertFromAuth(input: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  }) {
    return prisma.user.upsert({
      where: { id: input.id },
      create: input,
      update: {
        email: input.email,
        lastActiveAt: new Date(),
        ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
      },
      select: { username: true, role: true },
    });
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

  /** Public profile by username - returns null if not found or profile is private. */
  async findPublicProfile(username: string) {
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
    if (!user || user.preferences?.publicProfile === false) return null;
    return user;
  },
};
