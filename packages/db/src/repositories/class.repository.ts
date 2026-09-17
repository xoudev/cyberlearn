import { prisma } from "../prisma.js";

// Classes and who is in them.
//
// Every read here is scoped by the caller's own membership or teaching, not by
// a role: Prisma connects as the table owner and therefore bypasses RLS, so the
// policies in 20260915120000_classes_and_teacher_role are a second line of
// defence over the Data API rather than the one enforcing these queries. The
// scoping has to be in the where clause.

/**
 * What "a live class" means, in one place.
 *
 * Three levels can each retire a class and they all count: archiving a school
 * puts away its intakes, archiving an intake puts away its classes. Spelling
 * the condition out at each call site is what let them disagree - the sidebar
 * once counted archived classes and showed a door to a 404, and
 * findMembersVisibleTo read only the class's own flag, so it still served the
 * roster of a class whose whole intake had been put away.
 *
 * Exported because the web sidebar counts the same thing from its own query:
 * the door and the room behind it have to be deciding on the same rule.
 */
export const LIVE_CLASS_FILTER = {
  archivedAt: null,
  promotion: { archivedAt: null, establishment: { archivedAt: null } },
} as const;

export const classRepository = {
  /** The classes a user belongs to, most recently joined first. */
  async findForMember(userId: string) {
    const rows = await prisma.classMember.findMany({
      where: { userId, class: LIVE_CLASS_FILTER },
      orderBy: { joinedAt: "desc" },
      select: {
        joinedAt: true,
        class: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            teachers: {
              orderBy: { assignedAt: "asc" },
              select: {
                subject: true,
                teacher: {
                  select: { id: true, username: true, displayName: true, avatarUrl: true },
                },
              },
            },
            promotion: {
              select: {
                id: true,
                name: true,
                startYear: true,
                establishment: { select: { id: true, name: true, city: true } },
              },
            },
            _count: { select: { members: true } },
          },
        },
      },
    });
    return rows.map((r) => ({ ...r.class, joinedAt: r.joinedAt }));
  },

  /**
   * The classes a teacher follows, grouped establishment by establishment and
   * then promotion by promotion.
   *
   * A flat list is fine for one class and useless for twelve across three
   * schools, which is the case this shape exists for. Grouping happens here
   * rather than in the page so the teacher dashboard and any later view agree
   * on the order: establishment by name, most recent intake first, then class.
   */
  async findForTeacher(teacherId: string) {
    const classes = await prisma.class.findMany({
      where: {
        teachers: { some: { teacherId } },
        ...LIVE_CLASS_FILTER,
      },
      orderBy: [
        { promotion: { establishment: { name: "asc" } } },
        { promotion: { startYear: "desc" } },
        { promotion: { name: "asc" } },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: { select: { members: true } },
        promotion: {
          select: {
            id: true,
            name: true,
            slug: true,
            startYear: true,
            establishment: { select: { id: true, name: true, slug: true, city: true } },
          },
        },
      },
    });

    const establishments = new Map<
      string,
      {
        id: string;
        name: string;
        slug: string;
        city: string | null;
        promotions: Map<
          string,
          {
            id: string;
            name: string;
            startYear: number | null;
            classes: { id: string; name: string; slug: string; memberCount: number }[];
          }
        >;
      }
    >();

    for (const c of classes) {
      const est = c.promotion.establishment;
      let estEntry = establishments.get(est.id);
      if (!estEntry) {
        estEntry = { ...est, promotions: new Map() };
        establishments.set(est.id, estEntry);
      }
      let promoEntry = estEntry.promotions.get(c.promotion.id);
      if (!promoEntry) {
        promoEntry = {
          id: c.promotion.id,
          name: c.promotion.name,
          startYear: c.promotion.startYear,
          classes: [],
        };
        estEntry.promotions.set(c.promotion.id, promoEntry);
      }
      promoEntry.classes.push({
        id: c.id,
        name: c.name,
        slug: c.slug,
        memberCount: c._count.members,
      });
    }

    // Maps preserve insertion order, and insertion followed the query order.
    return [...establishments.values()].map((e) => ({
      id: e.id,
      name: e.name,
      slug: e.slug,
      city: e.city,
      promotions: [...e.promotions.values()],
    }));
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
        ...LIVE_CLASS_FILTER,
        OR: [
          { members: { some: { userId: viewerId } } },
          { teachers: { some: { teacherId: viewerId } } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        teachers: {
          orderBy: { assignedAt: "asc" },
          select: {
            subject: true,
            teacher: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        },
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

  /** The establishment / promotion tree, for composing and for pickers. */
  async listHierarchy() {
    return prisma.establishment.findMany({
      where: { archivedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        promotions: {
          where: { archivedAt: null },
          orderBy: [{ startYear: "desc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            slug: true,
            startYear: true,
            _count: { select: { classes: true } },
          },
        },
      },
    });
  },

  /**
   * The same tree as listHierarchy, archived rows included.
   *
   * listHierarchy feeds the pickers, where an archived school must not be
   * offered. This one feeds the screen that edits and un-archives them, which
   * cannot show what it is meant to bring back if it filters it out. Two
   * readers, two rules - the difference is the whole reason both exist.
   */
  async listStructure() {
    return prisma.establishment.findMany({
      orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        archivedAt: true,
        promotions: {
          orderBy: [{ archivedAt: "asc" }, { startYear: "desc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            slug: true,
            startYear: true,
            archivedAt: true,
            _count: { select: { classes: true } },
          },
        },
      },
    });
  },

  async listAll() {
    return prisma.class.findMany({
      orderBy: [
        { archivedAt: "asc" },
        { promotion: { establishment: { name: "asc" } } },
        { promotion: { startYear: "desc" } },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        archivedAt: true,
        createdAt: true,
        teachers: {
          orderBy: { assignedAt: "asc" },
          select: { subject: true, teacher: { select: { id: true, displayName: true } } },
        },
        promotion: {
          select: {
            id: true,
            name: true,
            startYear: true,
            establishment: { select: { id: true, name: true } },
          },
        },
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
        teachers: {
          orderBy: { assignedAt: "asc" },
          select: {
            subject: true,
            teacher: { select: { id: true, username: true, displayName: true } },
          },
        },
        promotion: {
          select: {
            id: true,
            name: true,
            establishment: { select: { id: true, name: true } },
          },
        },
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
    promotionId: string;
    name: string;
    slug: string;
    description: string | null;
  }) {
    return prisma.class.create({
      data: input,
      select: { id: true, name: true, slug: true },
    });
  },

  async update(
    classId: string,
    data: { name?: string; slug?: string; description?: string | null },
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

  async updateEstablishment(
    establishmentId: string,
    data: { name?: string; slug?: string; city?: string | null },
  ) {
    await prisma.establishment.update({ where: { id: establishmentId }, data });
  },

  /**
   * Archiving a school reaches its classes without touching a row of theirs.
   *
   * The intakes and classes underneath keep their own archivedAt, so bringing
   * the school back brings back exactly what was live when it went away -
   * a cascade of writes would have flattened that and could not be undone.
   * LIVE_CLASS_FILTER is what makes the reach work, by reading all three flags.
   */
  async setEstablishmentArchived(establishmentId: string, archived: boolean) {
    await prisma.establishment.update({
      where: { id: establishmentId },
      data: { archivedAt: archived ? new Date() : null },
    });
  },

  async updatePromotion(
    promotionId: string,
    data: { name?: string; slug?: string; startYear?: number | null },
  ) {
    await prisma.promotion.update({ where: { id: promotionId }, data });
  },

  async setPromotionArchived(promotionId: string, archived: boolean) {
    await prisma.promotion.update({
      where: { id: promotionId },
      data: { archivedAt: archived ? new Date() : null },
    });
  },

  /**
   * Idempotent: re-adding a member already in the class is a no-op, not an error.
   *
   * Returns the ids actually added rather than how many, because the caller
   * tells each of them they have been enrolled - and someone who was already in
   * the class should not be told again every time an administrator re-pastes the
   * roster. createMany reports a count and not which rows it wrote, so the
   * membership is read first and the difference is what gets inserted.
   *
   * Two administrators pasting the same list at the same moment could both see
   * the same difference and both notify; skipDuplicates keeps the table right,
   * and a duplicate notification is a better failure than a missing one.
   */
  async addMembers(classId: string, userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];

    const existing = await prisma.classMember.findMany({
      where: { classId, userId: { in: userIds } },
      select: { userId: true },
    });
    const already = new Set(existing.map((m) => m.userId));
    const toAdd = userIds.filter((id) => !already.has(id));
    if (toAdd.length === 0) return [];

    await prisma.classMember.createMany({
      data: toAdd.map((userId) => ({ classId, userId })),
      skipDuplicates: true,
    });
    return toAdd;
  },

  /** Idempotent: assigning a teacher already on the class only updates the subject. */
  async assignTeacher(classId: string, teacherId: string, subject: string | null) {
    await prisma.classTeacher.upsert({
      where: { classId_teacherId: { classId, teacherId } },
      create: { classId, teacherId, subject },
      update: { subject },
    });
  },

  async unassignTeacher(classId: string, teacherId: string) {
    await prisma.classTeacher.deleteMany({ where: { classId, teacherId } });
  },

  async removeMember(classId: string, userId: string) {
    await prisma.classMember.deleteMany({ where: { classId, userId } });
  },
};
