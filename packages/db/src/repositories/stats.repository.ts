import { prisma } from "../prisma.js";

export interface LandingStats {
  /** Categories with at least one published lesson. */
  domains: number;
  publishedLessons: number;
  publishedPaths: number;
  /** Distinct accounts seen in the last 30 days. */
  activeLearners: number;
  /** Mean of every rating left on a lesson or a path, or null when there are none. */
  ratingAvg: number | null;
  ratingsCount: number;
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

const ACTIVE_WINDOW_DAYS = 30;

export const statsRepository = {
  /**
   * Public counters for the landing page. Read-only aggregates over published
   * content and real activity; callers cache the result (ISR revalidation).
   *
   * Every number here must come from the database. The landing used to print a
   * hardcoded "12 400 apprenant·es actifs" and "4.8 / 5 sur 1 240 avis", which
   * no query backed. Social proof that cannot be traced to a row is worse than
   * no social proof at all.
   */
  async findLandingStats(): Promise<LandingStats> {
    const activeSince = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const [categories, publishedLessons, publishedPaths, activeLearners, ratings] =
      await Promise.all([
        prisma.lesson.findMany({
          where: { status: "PUBLISHED" },
          distinct: ["category"],
          select: { category: true },
        }),
        prisma.lesson.count({ where: { status: "PUBLISHED" } }),
        prisma.path.count({ where: { status: "PUBLISHED" } }),
        prisma.user.count({ where: { lastActiveAt: { gte: activeSince } } }),
        prisma.rating.aggregate({ _avg: { score: true }, _count: { _all: true } }),
      ]);

    return {
      domains: categories.length,
      publishedLessons,
      publishedPaths,
      activeLearners,
      ratingAvg: ratings._count._all > 0 ? (ratings._avg.score ?? null) : null,
      ratingsCount: ratings._count._all,
    };
  },

  /**
   * The paths shown as cards on the landing. Ordered by how much they have been
   * rated, then by age, so the strip reflects the real catalogue rather than an
   * invented one.
   */
  async findFeaturedPaths(take = 3): Promise<FeaturedPath[]> {
    const paths = await prisma.path.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ ratingsCount: "desc" }, { publishedAt: "asc" }],
      take,
      select: {
        slug: true,
        title: true,
        description: true,
        category: true,
        difficulty: true,
        lessons: { select: { lesson: { select: { xpReward: true } } } },
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
};
