import { randomUUID } from "node:crypto";
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
                // Read by the teacher view, which leads on how many of a class
                // have opened the site this week - the question a roster is
                // scanned for. Nothing renders it to a classmate.
                lastActiveAt: true,
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

  // ─── Invitations ──────────────────────────────────────────────────────────

  /**
   * Holds a place in a class for an address with no account yet.
   *
   * Idempotent per address: re-pasting a roster renews the expiry rather than
   * stacking a second row, and an address already invited is not counted as
   * newly invited - the caller only mails the ones it actually created.
   *
   * Addresses that already have an account are not this function's business;
   * the caller resolves those to ids and adds them as members.
   */
  async inviteToClass(
    classId: string,
    emails: string[],
    invitedById: string,
    expiresAt: Date,
  ): Promise<{ created: string[]; renewed: string[] }> {
    if (emails.length === 0) return { created: [], renewed: [] };

    const existing = await prisma.classInvitation.findMany({
      where: { classId, email: { in: emails } },
      select: { email: true },
    });
    const already = new Set(existing.map((i) => i.email));
    const created = emails.filter((e) => !already.has(e));
    const renewed = emails.filter((e) => already.has(e));

    if (created.length > 0) {
      await prisma.classInvitation.createMany({
        data: created.map((email) => ({ classId, email, invitedById, expiresAt })),
        skipDuplicates: true,
      });
    }
    if (renewed.length > 0) {
      // A renewal un-expires and un-accepts: an administrator re-inviting
      // someone is saying the place is open again.
      await prisma.classInvitation.updateMany({
        where: { classId, email: { in: renewed } },
        data: { expiresAt, invitedById, acceptedAt: null },
      });
    }

    return { created, renewed };
  },

  async listPendingInvitations(classId: string) {
    return prisma.classInvitation.findMany({
      where: { classId, acceptedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        createdAt: true,
        expiresAt: true,
        invitedBy: { select: { displayName: true, email: true } },
      },
    });
  },

  async revokeInvitation(invitationId: string): Promise<void> {
    await prisma.classInvitation.deleteMany({ where: { id: invitationId } });
  },

  /**
   * Turns every standing invitation for an address into a membership.
   *
   * Called on sign-in, from the one place that provisions a profile, because
   * the alternative is each sign-in path remembering to - and a path that
   * forgets leaves someone invited forever, looking at a product that never
   * mentions the class they were told they were in.
   *
   * The address is the credential. Supabase has verified it by the time this
   * runs, which is exactly what a token in a link could not promise: a link is
   * forwardable, and whoever opened it would land in a stranger's class with
   * their classmates' names in front of them.
   *
   * Expired rows are left alone rather than deleted - an expiry is a fact about
   * an invitation, and an administrator looking at the class should see that it
   * lapsed rather than find no trace of having sent it.
   */
  async redeemInvitationsForEmail(userId: string, email: string): Promise<string[]> {
    const normalized = email.trim().toLowerCase();
    if (normalized.length === 0) return [];

    const pending = await prisma.classInvitation.findMany({
      where: {
        email: normalized,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
        // An invitation to a class that has since been archived - or whose
        // intake or school has - is not a place to put anyone. The shared
        // filter rather than a fourth copy of the rule: a copy is how this
        // came to read two levels while everything else reads three.
        class: LIVE_CLASS_FILTER,
      },
      select: {
        id: true,
        classId: true,
        class: { select: { name: true } },
      },
    });
    if (pending.length === 0) return [];

    // The mirror of addMembers: one person, several classes. Same reason for
    // reading first - skipDuplicates keeps the table right but reports a count,
    // and what is needed here is which of them are new, so nobody is told twice
    // about a class they were already in.
    const alreadyIn = await prisma.classMember.findMany({
      where: { userId, classId: { in: pending.map((i) => i.classId) } },
      select: { classId: true },
    });
    const known = new Set(alreadyIn.map((m) => m.classId));
    const joined = pending.map((i) => i.classId).filter((id) => !known.has(id));

    if (joined.length > 0) {
      await prisma.classMember.createMany({
        data: joined.map((classId) => ({ classId, userId })),
        skipDuplicates: true,
      });
    }

    await prisma.classInvitation.updateMany({
      where: { id: { in: pending.map((i) => i.id) } },
      data: { acceptedAt: new Date() },
    });

    // The bell, and not an e-mail: the person is signing in as this runs, and
    // the invitation mail already told them which class. A second message about
    // the same fact, delivered while they are looking at the product, is noise.
    const notified = pending.filter((i) => joined.includes(i.classId));
    if (notified.length > 0) {
      await prisma.notification.createMany({
        data: notified.map((i) => ({
          userId,
          type: "CLASS_ENROLLED" as const,
          title: `Tu as rejoint ${i.class.name}`,
          body: "Ton invitation a été acceptée automatiquement à la connexion.",
          actionUrl: "/my-class",
        })),
      });
    }

    return notified.map((i) => i.classId);
  },

  // ─── Assignments ──────────────────────────────────────────────────────────

  /**
   * Whether this account may set work for this class.
   *
   * The web app has no admin gate - a teacher is an ordinary signed-in user
   * there - so every write below is checked against the class tables rather
   * than against a role. A teacher of one class must not be able to set work
   * for another by knowing its id, and an ADMIN is included because the console
   * and the site are the same product to the person using them.
   */
  async canSetWorkFor(userId: string, classId: string): Promise<boolean> {
    const [teaches, user] = await Promise.all([
      prisma.classTeacher.count({ where: { classId, teacherId: userId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    ]);
    return teaches > 0 || user?.role === "ADMIN";
  },

  /** The work set for these classes, soonest deadline first. */
  async listAssignments(classIds: string[]) {
    if (classIds.length === 0) return [];
    return prisma.classAssignment.findMany({
      where: { classId: { in: classIds } },
      // Nulls last: an assignment with no deadline is not overdue and not
      // urgent, so it belongs under the ones that are.
      orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      select: {
        id: true,
        classId: true,
        lessonId: true,
        instructions: true,
        dueAt: true,
        createdAt: true,
        lesson: {
          select: {
            id: true,
            slug: true,
            title: true,
            category: true,
            difficulty: true,
            estimatedMinutes: true,
          },
        },
        assignedBy: { select: { displayName: true, username: true } },
      },
    });
  },

  /**
   * Sets a lesson for a class, or moves the deadline of one already set.
   *
   * Upsert rather than insert: a teacher re-assigning a lesson is changing the
   * date, and a second row for the same lesson would show the class the same
   * work twice with two different deadlines. Returns whether it was new, so the
   * caller can tell the class about work they have not seen before and stay
   * quiet about a date being moved by a day.
   */
  async assignLesson(input: {
    classId: string;
    lessonId: string;
    assignedById: string;
    dueAt: Date | null;
    instructions: string | null;
  }): Promise<{ created: boolean }> {
    const existing = await prisma.classAssignment.findUnique({
      where: { classId_lessonId: { classId: input.classId, lessonId: input.lessonId } },
      select: { id: true },
    });

    await prisma.classAssignment.upsert({
      where: { classId_lessonId: { classId: input.classId, lessonId: input.lessonId } },
      create: input,
      update: {
        dueAt: input.dueAt,
        instructions: input.instructions,
        assignedById: input.assignedById,
      },
    });
    return { created: existing === null };
  },

  async unassignLesson(classId: string, lessonId: string): Promise<void> {
    await prisma.classAssignment.deleteMany({ where: { classId, lessonId } });
  },

  /**
   * Which of these people have finished which of these lessons.
   *
   * One query for the whole page rather than one per assignment. Completion is
   * read from UserLessonProgress and not stored on the assignment: a second
   * record of the same fact is a second answer free to disagree with the first,
   * and a student who finished a lesson before it was ever set has done it.
   */
  async findCompletions(userIds: string[], lessonIds: string[]): Promise<Set<string>> {
    if (userIds.length === 0 || lessonIds.length === 0) return new Set();
    const rows = await prisma.userLessonProgress.findMany({
      where: { status: "COMPLETED", userId: { in: userIds }, lessonId: { in: lessonIds } },
      select: { userId: true, lessonId: true },
    });
    return new Set(rows.map((r) => `${r.userId}:${r.lessonId}`));
  },

  // ─── Lessons a teacher wrote for their classes ────────────────────────────

  /** The CLASS lessons shown to these classes, newest first. */
  async listClassLessons(classIds: string[]) {
    if (classIds.length === 0) return [];
    const rows = await prisma.lessonClass.findMany({
      where: { classId: { in: classIds } },
      orderBy: { linkedAt: "desc" },
      select: {
        classId: true,
        lesson: {
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            category: true,
            difficulty: true,
            estimatedMinutes: true,
            xpReward: true,
            // Lesson.authorId is a plain column with no relation behind it -
            // the catalogue never needed to join to one - so the id is what
            // there is. The class already knows who its teachers are.
            authorId: true,
            createdAt: true,
          },
        },
      },
    });
    return rows.map((r) => ({ classId: r.classId, ...r.lesson }));
  },

  /**
   * Writes a lesson for one class.
   *
   * It is an ordinary Lesson row with audience CLASS, not a parallel kind of
   * content. Everything the platform already does to a lesson - progress, XP,
   * the review schedule, being assigned with a deadline - then works on it
   * without a line of new code, and the only thing that differs is who may see
   * it. A second content type would have needed all of that written again, and
   * would have got some of it wrong.
   *
   * refCode and slug are generated rather than asked for: they are a
   * cataloguing convention, and a teacher writing a lesson for their class is
   * not filing it in the catalogue.
   */
  async createClassLesson(input: {
    classId: string;
    authorId: string;
    title: string;
    description: string;
    category: "DEV" | "CYBERSEC" | "NETWORK";
    difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
    estimatedMinutes: number;
    xpReward: number;
    contentMdx: string;
  }): Promise<{ id: string; slug: string }> {
    const { classId, ...lesson } = input;
    // CL-CLS marks the origin at a glance in the admin list and cannot collide
    // with the CL-LSN-000-V00 series the catalogue uses.
    const token = randomUUID().slice(0, 8);
    const slugBase = lesson.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/gu, "")
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-+|-+$/gu, "")
      .slice(0, 60);

    const created = await prisma.lesson.create({
      data: {
        ...lesson,
        refCode: `CL-CLS-${token}-V01`,
        // The token keeps it unique without asking the teacher to care: two
        // classes may both have a "Révisions du chapitre 3".
        slug: `${slugBase === "" ? "lecon" : slugBase}-${token}`,
        audience: "CLASS",
        // Published immediately: a draft would be a lesson the class cannot
        // open, and the teacher has no console to publish it from later.
        status: "PUBLISHED",
        publishedAt: new Date(),
        classLinks: { create: { classId } },
      },
      select: { id: true, slug: true },
    });
    return created;
  },

  async updateClassLesson(
    lessonId: string,
    data: {
      title?: string;
      description?: string;
      category?: "DEV" | "CYBERSEC" | "NETWORK";
      difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
      estimatedMinutes?: number;
      xpReward?: number;
      contentMdx?: string;
    },
  ): Promise<void> {
    await prisma.lesson.updateMany({ where: { id: lessonId, audience: "CLASS" }, data });
  },

  /**
   * Whether this account may edit or delete this class lesson.
   *
   * Its author, or a teacher of a class it is shown to. Co-teachers of the same
   * class share the material, and a teacher who leaves should not take the term
   * with them.
   */
  async canEditClassLesson(userId: string, lessonId: string): Promise<boolean> {
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        audience: "CLASS",
        OR: [
          { authorId: userId },
          { classLinks: { some: { class: { teachers: { some: { teacherId: userId } } } } } },
        ],
      },
      select: { id: true },
    });
    if (lesson !== null) return true;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    return user?.role === "ADMIN";
  },

  /**
   * Deletes a class lesson outright.
   *
   * Archiving it would leave a lesson nobody can reach in a catalogue nobody
   * can see it in. What is lost with it is the progress rows that hang off it,
   * which is correct: they measure work on material that no longer exists.
   * Refuses anything that is not a CLASS lesson, so a stray id cannot take a
   * catalogue lesson with it.
   */
  async deleteClassLesson(lessonId: string): Promise<void> {
    await prisma.lesson.deleteMany({ where: { id: lessonId, audience: "CLASS" } });
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
