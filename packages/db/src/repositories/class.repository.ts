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
      // The promotion's archivedAt counts as much as the class's: archiving an
      // intake is how a whole year is put away, and a class whose promotion is
      // gone is as retired as one archived by name. findForTeacher already
      // reads it this way, and the sidebar counts on both agreeing.
      where: { userId, class: { archivedAt: null, promotion: { archivedAt: null } } },
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
        archivedAt: null,
        promotion: { archivedAt: null },
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
        archivedAt: null,
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

  async update(classId: string, data: { name?: string; description?: string | null }) {
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
