import { prisma } from "../prisma.js";

/**
 * Classes and who is in them.
 *
 * Every read here is scoped by the caller's own membership or teaching, not by
 * a role: Prisma connects as the table owner and therefore bypasses RLS, so the
 * policies in 20260915120000_classes_and_teacher_role are a second line of
 * defence over the Data API rather than the one enforcing these queries. The
 * scoping has to be in the where clause.
 */
export const classRepository = {
  /** The classes a user belongs to, most recently joined first. */
  async findForMember(userId: string) {
    const rows = await prisma.classMember.findMany({
      where: { userId, class: { archivedAt: null } },
      orderBy: { joinedAt: "desc" },
      select: {
        joinedAt: true,
        class: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            teacher: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            _count: { select: { members: true } },
          },
        },
      },
    });
    return rows.map((r) => ({ ...r.class, joinedAt: r.joinedAt }));
  },

  /** The classes a teacher follows. */
  async findForTeacher(teacherId: string) {
    return prisma.class.findMany({
      where: { teacherId, archivedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: { select: { members: true } },
      },
    });
  },

  /**
   * The people in a class, for a caller who is entitled to see them.
   *
   * `viewerId` is not decoration: it is the entitlement check. The query
   * returns nothing unless the viewer is in the class or teaches it, so a
   * caller cannot read a class they merely know the id of.
   */
  async findMembersVisibleTo(classId: string, viewerId: string) {
    const klass = await prisma.class.findFirst({
      where: {
        id: classId,
        archivedAt: null,
        OR: [{ members: { some: { userId: viewerId } } }, { teacherId: viewerId }],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        teacher: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        members: {
          orderBy: [{ user: { xpTotal: "desc" } }, { joinedAt: "asc" }],
          select: {
            joinedAt: true,
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                level: true,
                xpTotal: true,
                streakDays: true,
                preferences: { select: { publicProfile: true } },
              },
            },
          },
        },
      },
    });
    return klass;
  },

  // ─── Admin composition ────────────────────────────────────────────────────
  // Callers below are reached only from the admin app, which gates on
  // role === "ADMIN" plus a completed TOTP challenge.

  async listAll() {
    return prisma.class.findMany({
      orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        archivedAt: true,
        createdAt: true,
        teacher: { select: { id: true, username: true, displayName: true } },
        _count: { select: { members: true } },
      },
    });
  },

  async findById(classId: string) {
    return prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        archivedAt: true,
        teacherId: true,
        teacher: { select: { id: true, username: true, displayName: true } },
        members: {
          orderBy: { joinedAt: "asc" },
          select: {
            joinedAt: true,
            user: {
              select: { id: true, username: true, displayName: true, email: true, role: true },
            },
          },
        },
      },
    });
  },

  async create(input: {
    name: string;
    slug: string;
    description: string | null;
    teacherId: string | null;
  }) {
    return prisma.class.create({
      data: input,
      select: { id: true, name: true, slug: true },
    });
  },

  async update(
    classId: string,
    data: { name?: string; description?: string | null; teacherId?: string | null },
  ) {
    await prisma.class.update({ where: { id: classId }, data });
  },

  /** Archive rather than delete: a class carries who was in it, which is history. */
  async setArchived(classId: string, archived: boolean) {
    await prisma.class.update({
      where: { id: classId },
      data: { archivedAt: archived ? new Date() : null },
    });
  },

  /** Idempotent: re-adding a member already in the class is a no-op, not an error. */
  async addMembers(classId: string, userIds: string[]) {
    if (userIds.length === 0) return 0;
    const created = await prisma.classMember.createMany({
      data: userIds.map((userId) => ({ classId, userId })),
      skipDuplicates: true,
    });
    return created.count;
  },

  async removeMember(classId: string, userId: string) {
    await prisma.classMember.deleteMany({ where: { classId, userId } });
  },
};
