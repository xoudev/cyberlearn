import { prisma } from "../prisma.js";

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
      prisma.lesson.findMany({
        where: { status: "PUBLISHED" },
        distinct: ["category"],
        select: { category: true },
      }),
      prisma.lesson.count({ where: { status: "PUBLISHED" } }),
      prisma.path.count({ where: { status: "PUBLISHED" } }),
    ]);

    return { domains: categories.length, publishedLessons, publishedPaths };
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

  async findPublicCatalog(): Promise<PublicCatalogPath[]> {
    const paths = await prisma.path.findMany({
      where: { status: "PUBLISHED" },
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
        lessons: { select: { lesson: { select: { xpReward: true } } } },
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
    }));
  },
};
