import { prisma } from "@cyberlearn/db";
import { isFirstCataloguePath } from "@cyberlearn/types";

/**
 * The console's paths, in two folders like its lessons: the working list
 * (drafts and published paths) and the archives.
 */

export type PathFolder = "active" | "archives";

/** Which catalogue a path comes from. */
export type PathOrigin = "new" | "first" | "class";

export interface PathListRow {
  id: string;
  refCode: string;
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  avgRating: number | null;
  ratingsCount: number;
  lessons: number;
  completions: number;
  certificates: number;
  origin: PathOrigin;
}

export interface PathList {
  rows: PathListRow[];
  counts: { published: number; draft: number; archived: number };
}

export function pathOrigin(refCode: string, audience: "CATALOGUE" | "CLASS"): PathOrigin {
  if (audience === "CLASS") return "class";
  return isFirstCataloguePath(refCode) ? "first" : "new";
}

export async function listPaths(folder: PathFolder): Promise<PathList> {
  const [paths, grouped] = await Promise.all([
    prisma.path.findMany({
      where:
        folder === "archives" ? { status: "ARCHIVED" } : { status: { in: ["DRAFT", "PUBLISHED"] } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        refCode: true,
        slug: true,
        title: true,
        category: true,
        difficulty: true,
        status: true,
        audience: true,
        avgRating: true,
        ratingsCount: true,
        _count: {
          select: {
            lessons: true,
            progress: { where: { status: "COMPLETED" } },
            certificates: { where: { revokedAt: null } },
          },
        },
      },
    }),
    prisma.path.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const count = (status: PathListRow["status"]): number =>
    grouped.find((g) => g.status === status)?._count._all ?? 0;

  return {
    rows: paths.map((p) => ({
      id: p.id,
      refCode: p.refCode,
      slug: p.slug,
      title: p.title,
      category: p.category,
      difficulty: p.difficulty,
      status: p.status,
      avgRating: p.avgRating,
      ratingsCount: p.ratingsCount,
      lessons: p._count.lessons,
      completions: p._count.progress,
      certificates: p._count.certificates,
      origin: pathOrigin(p.refCode, p.audience),
    })),
    counts: {
      published: count("PUBLISHED"),
      draft: count("DRAFT"),
      archived: count("ARCHIVED"),
    },
  };
}
