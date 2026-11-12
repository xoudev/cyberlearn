import { prisma } from "../prisma.js";
import { CATALOGUE_LESSON } from "./lesson.repository.js";
import { CATALOGUE_PATH, PUBLISHED_PATH_LESSON } from "./path.repository.js";
import { WITHOUT_CRON_RUNS } from "./cron-run.repository.js";
import { CRITICAL_TICKET_WHERE, OPEN_TICKET_STATUSES } from "./ticket.repository.js";

export interface LandingStats {
  /** Categories with at least one published lesson. */
  domains: number;
  publishedLessons: number;
  publishedPaths: number;
}

/** A published path, summarised for the public landing page. */
export interface FeaturedPath {
  slug: string;
  title: string;
  description: string;
  category: "DEV" | "CYBERSEC" | "NETWORK";
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  lessons: number;
  /** Sum of xpReward over the path's lessons. */
  xp: number;
}

export interface PublicCatalogPath extends FeaturedPath {
  refCode: string;
  track: "SKILL" | "CAREER";
  estimatedHours: number;
  hasCertificate: boolean;
  /** The learners' average, null until somebody has rated the path. */
  rating: { avg: number; count: number } | null;
  /** As stored: an uploaded cover's marker, or null. The site resolves it. */
  coverImageUrl: string | null;
}

export const statsRepository = {
  /**
   * Public counters for the landing page. Read-only aggregates over published
   * content; callers cache the result (ISR revalidation).
   *
   * Every number here must come from the database. The landing used to print a
   * hardcoded "12 400 apprenant·es actifs" and "4.8 / 5 sur 1 240 avis", which
   * no query backed. Both lines are gone rather than rewired: with a young
   * catalogue there is no social proof to show, and a truthful "0 apprenant·es
   * actif·ves" reads worse than no line at all. The honest signal is the size
   * of the catalogue, which the stats strip already carries.
   */
  async findLandingStats(): Promise<LandingStats> {
    const [categories, publishedLessons, publishedPaths] = await Promise.all([
      // CATALOGUE_LESSON rather than "published": a lesson a teacher wrote for
      // one class is published - the class has to open it - and counting it
      // here would advertise it as the platform's own content on a page seen
      // by people who cannot see the lesson.
      prisma.lesson.findMany({
        where: CATALOGUE_LESSON,
        distinct: ["category"],
        select: { category: true },
      }),
      prisma.lesson.count({ where: CATALOGUE_LESSON }),
      prisma.path.count({ where: CATALOGUE_PATH }),
    ]);

    return { domains: categories.length, publishedLessons, publishedPaths };
  },

  /**
   * The paths shown as cards on the landing. Ordered by how much they have been
   * rated, then by age, so the strip reflects the real catalogue rather than an
   * invented one.
   *
   * CATALOGUE_PATH rather than "published", like the figures above: a path a
   * teacher built for one class is published, and a visitor must not read its
   * title on the platform's front page.
   */
  async findFeaturedPaths(take = 3): Promise<FeaturedPath[]> {
    const paths = await prisma.path.findMany({
      where: CATALOGUE_PATH,
      orderBy: [{ ratingsCount: "desc" }, { publishedAt: "asc" }],
      take,
      select: {
        slug: true,
        title: true,
        description: true,
        category: true,
        difficulty: true,
        // Its missions as the path page counts them: a draft or an archived
        // lesson still linked to it is neither a lesson to announce nor XP.
        lessons: {
          where: PUBLISHED_PATH_LESSON,
          select: { lesson: { select: { xpReward: true } } },
        },
      },
    });

    return paths.map((p) => ({
      slug: p.slug,
      title: p.title,
      description: p.description,
      category: p.category,
      difficulty: p.difficulty,
      lessons: p.lessons.length,
      xp: p.lessons.reduce((sum, l) => sum + l.lesson.xpReward, 0),
    }));
  },

  /**
   * The public catalogue of paths, for visitors. The catalogue only: a class's
   * path is published and still none of a visitor's business.
   */
  async findPublicCatalog(): Promise<PublicCatalogPath[]> {
    const paths = await prisma.path.findMany({
      where: CATALOGUE_PATH,
      orderBy: [{ publishedAt: "desc" }, { title: "asc" }],
      select: {
        slug: true,
        refCode: true,
        title: true,
        description: true,
        category: true,
        track: true,
        difficulty: true,
        estimatedHours: true,
        certificateTemplate: true,
        avgRating: true,
        ratingsCount: true,
        coverImageUrl: true,
        lessons: {
          where: PUBLISHED_PATH_LESSON,
          select: { lesson: { select: { xpReward: true } } },
        },
      },
    });

    return paths.map((path) => ({
      slug: path.slug,
      refCode: path.refCode,
      title: path.title,
      description: path.description,
      category: path.category,
      track: path.track,
      difficulty: path.difficulty,
      estimatedHours: path.estimatedHours,
      lessons: path.lessons.length,
      xp: path.lessons.reduce((sum, item) => sum + item.lesson.xpReward, 0),
      hasCertificate: path.certificateTemplate !== null,
      rating:
        path.avgRating !== null && path.ratingsCount > 0
          ? { avg: path.avgRating, count: path.ratingsCount }
          : null,
      coverImageUrl: path.coverImageUrl,
    }));
  },

  /** The counts beside the console's sidebar entries. */
  async findSidebarCounts() {
    const [lessons, paths, badges, challenges, users] = await Promise.all([
      prisma.lesson.count({ where: { status: "PUBLISHED" } }),
      prisma.path.count({ where: { status: "PUBLISHED" } }),
      prisma.badge.count(),
      prisma.challenge.count({ where: { isActive: true } }),
      prisma.user.count(),
    ]);
    return { lessons, paths, badges, challenges, users };
  },

  /** How much of everything the database holds, for the console's settings page. */
  async findConsoleTotals() {
    const [users, lessons, paths, badges, certificates, tickets, auditLogs] = await Promise.all([
      prisma.user.count(),
      prisma.lesson.count(),
      prisma.path.count(),
      prisma.badge.count(),
      prisma.certificate.count({ where: { revokedAt: null } }),
      prisma.contactTicket.count(),
      prisma.auditLog.count(),
    ]);
    return { users, lessons, paths, badges, certificates, tickets, auditLogs };
  },

  /**
   * What the console's dashboard reads: its figures and what they gained
   * lately, the dated rows its weekly curves are drawn from, and its two feeds.
   *
   * `horizon` is how far back the curves go.
   */
  async findConsoleDashboard(since: { horizon: Date; oneWeekAgo: Date; oneMonthAgo: Date }) {
    const { horizon, oneWeekAgo, oneMonthAgo } = since;
    const [
      userCount,
      usersThisWeek,
      lessonCount,
      lessonThisMonth,
      certCount,
      certThisWeek,
      activeTickets,
      openTickets,
      criticalTickets,
      userDates,
      lessonDates,
      certDates,
      ticketDates,
      lessonsByStatus,
      pathCount,
      recentLogs,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: oneWeekAgo } } }),
      prisma.lesson.count({ where: { status: "PUBLISHED" } }),
      prisma.lesson.count({ where: { status: "PUBLISHED", publishedAt: { gte: oneMonthAgo } } }),
      prisma.certificate.count({ where: { revokedAt: null } }),
      prisma.certificate.count({ where: { revokedAt: null, issuedAt: { gte: oneWeekAgo } } }),
      // The card counts what its delta counts within: open or in progress. With
      // OPEN alone, a security report taken in hand read "0" over "1 critique".
      prisma.contactTicket.count({ where: { status: { in: [...OPEN_TICKET_STATUSES] } } }),
      prisma.contactTicket.count({ where: { status: "OPEN" } }),
      // The tickets page's definitions, from the same place: a security report
      // taken in hand is still critical, here as there.
      prisma.contactTicket.count({ where: CRITICAL_TICKET_WHERE }),
      prisma.user.findMany({
        where: { createdAt: { gte: horizon } },
        select: { createdAt: true },
      }),
      prisma.lesson.findMany({
        where: { publishedAt: { gte: horizon } },
        select: { publishedAt: true },
      }),
      prisma.certificate.findMany({
        where: { issuedAt: { gte: horizon }, revokedAt: null },
        select: { issuedAt: true },
      }),
      prisma.contactTicket.findMany({
        where: { createdAt: { gte: horizon } },
        select: { createdAt: true },
      }),
      prisma.lesson.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.path.count({ where: { status: "PUBLISHED" } }),
      // What people did: the jobs' runs, ten a day, would push it out of the feed.
      prisma.auditLog.findMany({
        where: WITHOUT_CRON_RUNS,
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          actor: { select: { username: true, displayName: true, email: true, avatarUrl: true } },
        },
      }),
      prisma.user.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          avatarUrl: true,
          role: true,
          level: true,
          createdAt: true,
        },
      }),
    ]);
    return {
      userCount,
      usersThisWeek,
      lessonCount,
      lessonThisMonth,
      certCount,
      certThisWeek,
      activeTickets,
      openTickets,
      criticalTickets,
      userDates,
      lessonDates,
      certDates,
      ticketDates,
      lessonsByStatus,
      pathCount,
      recentLogs,
      recentUsers,
    };
  },
};
