import { prisma } from "../prisma.js";

export interface LandingStats {
  /** Categories with at least one published lesson. */
  domains: number;
  publishedLessons: number;
  publishedPaths: number;
}

export const statsRepository = {
  /**
   * Public counters for the landing page stats strip. Read-only aggregates
   * over published content; callers cache the result (ISR revalidation).
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
    return {
      domains: categories.length,
      publishedLessons,
      publishedPaths,
    };
  },
};
