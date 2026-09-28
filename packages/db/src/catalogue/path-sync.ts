/**
 * Writes one path, its modules and its lesson links from a source that lists
 * them in study order. The one implementation behind both doors a path can come
 * in by: the seed-paths script, and the console's "Synchroniser avec le dépôt"
 * page, which reads content/paths/<slug>.json in production.
 *
 * Idempotent. A new path is created as DRAFT, like an imported lesson, and
 * published from the console after review; an existing one keeps its status
 * and its slug. A lesson refCode not in the database is skipped and reported:
 * it attaches on the next run, once imported.
 */

import type { PrismaClient } from "@prisma/client";
import type { PathManifest } from "@cyberlearn/types";
import { manifestLessons } from "./path-manifests";

export interface CataloguePath {
  refCode: string;
  slug: string;
  title: string;
  description: string;
  category: "DEV" | "CYBERSEC" | "NETWORK";
  track: "SKILL" | "CAREER";
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  estimatedHours: number;
  modules: { title: string; description: string | null }[];
  /** In study order; moduleIndex points into `modules`, null without modules. */
  lessons: { refCode: string; moduleIndex: number | null }[];
}

export interface PathSyncResult {
  pathId: string;
  /** False when the path already existed and was updated. */
  created: boolean;
  /** Lessons of the source now linked to the path. */
  attached: number;
  /** Lessons of the source not in the database, left out until imported. */
  missing: string[];
  /** Lessons linked to the path but no longer in the source, kept at the end. */
  leftovers: string[];
}

/** A path of the new catalogue, as a content/paths manifest describes it. */
export function catalogueFromManifest(manifest: PathManifest): CataloguePath {
  return {
    refCode: manifest.refCode,
    slug: manifest.slug,
    title: manifest.title,
    description: manifest.description,
    category: manifest.category,
    track: manifest.track,
    difficulty: manifest.difficulty,
    estimatedHours: manifest.estimatedHours,
    modules: manifest.modules.map((module) => ({
      title: module.title,
      description: module.description ?? null,
    })),
    lessons: manifestLessons(manifest),
  };
}

// Positions are moved out of the way before a path is rewritten: the unique
// (pathId, position) refuses a reorder written one row at a time.
const POSITION_PARKING = 1_000_000;

export async function syncPath(client: PrismaClient, p: CataloguePath): Promise<PathSyncResult> {
  const fields = {
    title: p.title,
    description: p.description,
    category: p.category,
    track: p.track,
    difficulty: p.difficulty,
    estimatedHours: p.estimatedHours,
  };
  const existing = await client.path.findUnique({
    where: { refCode: p.refCode },
    select: { id: true },
  });
  const path = await client.path.upsert({
    where: { refCode: p.refCode },
    create: { refCode: p.refCode, slug: p.slug, status: "DRAFT", ...fields },
    update: fields,
    select: { id: true },
  });

  const found = await client.lesson.findMany({
    where: { refCode: { in: p.lessons.map((l) => l.refCode) } },
    select: { id: true, refCode: true },
  });
  const idByRef = new Map(found.map((l) => [l.refCode, l.id]));
  const missing = p.lessons.filter((l) => !idByRef.has(l.refCode)).map((l) => l.refCode);

  const leftovers = await client.$transaction(
    async (tx) => {
      await tx.pathLesson.updateMany({
        where: { pathId: path.id },
        data: { position: { increment: POSITION_PARKING } },
      });

      const moduleIds: string[] = [];
      for (const [index, module] of p.modules.entries()) {
        const saved = await tx.pathModule.upsert({
          where: { pathId_position: { pathId: path.id, position: index + 1 } },
          create: {
            pathId: path.id,
            position: index + 1,
            title: module.title,
            description: module.description,
          },
          update: { title: module.title, description: module.description },
          select: { id: true },
        });
        moduleIds.push(saved.id);
      }
      await tx.pathModule.deleteMany({
        where: { pathId: path.id, position: { gt: p.modules.length } },
      });

      let position = 1;
      for (const lesson of p.lessons) {
        const lessonId = idByRef.get(lesson.refCode);
        if (!lessonId) continue;
        const moduleId =
          lesson.moduleIndex === null ? null : (moduleIds[lesson.moduleIndex] ?? null);
        await tx.pathLesson.upsert({
          where: { pathId_lessonId: { pathId: path.id, lessonId } },
          create: { pathId: path.id, lessonId, position, moduleId },
          update: { position, moduleId },
        });
        position++;
      }

      // Lessons linked to the path but no longer in its source: kept, after
      // the others and out of any module. A sync never empties a path someone
      // may be halfway through; removing one is a decision for the console.
      const stale = await tx.pathLesson.findMany({
        where: { pathId: path.id, position: { gt: POSITION_PARKING } },
        orderBy: { position: "asc" },
        select: { lessonId: true, lesson: { select: { refCode: true } } },
      });
      for (const link of stale) {
        await tx.pathLesson.update({
          where: { pathId_lessonId: { pathId: path.id, lessonId: link.lessonId } },
          data: { position, moduleId: null },
        });
        position++;
      }
      return stale.map((link) => link.lesson.refCode);
    },
    { timeout: 120_000 },
  );

  return {
    pathId: path.id,
    created: existing === null,
    attached: p.lessons.length - missing.length,
    missing,
    leftovers,
  };
}
