import { prisma } from "@cyberlearn/db";
import { isFirstCatalogueLesson, isFirstCataloguePath } from "@cyberlearn/types";

/**
 * The first catalogue - 16 paths (CL-PATH-001 to 016) and their 192 lessons
 * (CL-LSN-001 to 192) - set aside in one go now that the new catalogue replaces
 * it. Archiving keeps every row, progress and answer: it only takes the content
 * off the site and the app, and a lesson or a path can be brought back from
 * the console's archives.
 *
 * Paths and lessons go together: an archived lesson disappears from the paths
 * that hold it, so archiving the lessons alone would leave 16 published paths
 * with nothing in them.
 */

export interface FirstCatalogueCounts {
  paths: number;
  lessons: number;
}

async function remaining(): Promise<{ pathIds: string[]; lessonIds: string[] }> {
  const [paths, lessons] = await Promise.all([
    prisma.path.findMany({
      where: { audience: "CATALOGUE", status: { not: "ARCHIVED" } },
      select: { id: true, refCode: true },
    }),
    prisma.lesson.findMany({
      where: { audience: "CATALOGUE", status: { not: "ARCHIVED" } },
      select: { id: true, refCode: true },
    }),
  ]);
  return {
    pathIds: paths.filter((p) => isFirstCataloguePath(p.refCode)).map((p) => p.id),
    lessonIds: lessons.filter((l) => isFirstCatalogueLesson(l.refCode)).map((l) => l.id),
  };
}

/** What is still out of the archives. Reads, writes nothing. */
export async function firstCatalogueCounts(): Promise<FirstCatalogueCounts> {
  const { pathIds, lessonIds } = await remaining();
  return { paths: pathIds.length, lessons: lessonIds.length };
}

/** Archives every first-catalogue path and lesson still out, and records it. */
export async function archiveFirstCatalogue(actorId: string): Promise<FirstCatalogueCounts> {
  const { pathIds, lessonIds } = await remaining();
  if (pathIds.length === 0 && lessonIds.length === 0) return { paths: 0, lessons: 0 };

  // Counted from what the update really changed, not from the read above.
  const [paths, lessons] = await prisma.$transaction([
    prisma.path.updateMany({
      where: { id: { in: pathIds }, status: { not: "ARCHIVED" } },
      data: { status: "ARCHIVED" },
    }),
    prisma.lesson.updateMany({
      where: { id: { in: lessonIds }, status: { not: "ARCHIVED" } },
      data: { status: "ARCHIVED" },
    }),
    prisma.auditLog.create({
      data: {
        actorId,
        action: "catalogue.first.archive",
        targetType: "catalogue",
        targetId: null,
        metadata: { paths: pathIds.length, lessons: lessonIds.length },
      },
    }),
  ]);
  return { paths: paths.count, lessons: lessons.count };
}
