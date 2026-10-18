"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { lessonRepository, pathRepository, prisma } from "@cyberlearn/db";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { requireAdminAction } from "@/lib/auth";
import { findPrerequisiteCycle } from "@/lib/lesson-prerequisites";
import { lessonPathIdsSchema, lessonPrerequisiteIdsSchema } from "./lesson-links";

/**
 * The paths a lesson is in and the lessons it requires, saved from its page.
 *
 * Both were written only by the import and the sync: the console showed
 * neither and could change neither. Each is saved on its own, apart from the
 * lesson's form, so choosing a path does not depend on the MDX being valid.
 */

export interface LessonLinksResult {
  ok?: true;
  error?: string;
}

function revalidateLesson(lessonId: string): void {
  revalidatePath(`/lessons/${lessonId}/edit`);
  revalidatePath("/lessons");
}

// ── Paths ─────────────────────────────────────────────────────────────────────

/**
 * Puts a lesson in exactly these catalogue paths.
 *
 * A path it joins takes it at the end, in its last module; a path it leaves
 * closes the gap (pathRepository.attachLesson, detachLesson). The paths it
 * stays in do not move it. A teacher's class path is not the console's to
 * edit from here: those links are left as they are.
 */
export async function setLessonPathsAction(
  lessonId: string,
  pathIds: string[],
): Promise<LessonLinksResult> {
  const admin = await requireAdminAction();

  const id = z.guid().safeParse(lessonId);
  if (!id.success) return { error: "Leçon invalide." };
  const ids = lessonPathIdsSchema.safeParse(pathIds);
  if (!ids.success) return { error: ids.error.issues[0]?.message ?? "Parcours invalides." };

  const lesson = await prisma.lesson.findUnique({
    where: { id: id.data },
    select: {
      id: true,
      refCode: true,
      audience: true,
      pathLessons: {
        where: { path: { audience: "CATALOGUE" } },
        select: { pathId: true, path: { select: { refCode: true } } },
      },
    },
  });
  if (!lesson) return { error: "Leçon introuvable." };
  if (lesson.audience !== "CATALOGUE") {
    return { error: "Une leçon de classe n'entre pas dans un parcours du catalogue." };
  }

  const current = new Set(lesson.pathLessons.map((link) => link.pathId));
  const wanted = new Set(ids.data);
  const added = ids.data.filter((pathId) => !current.has(pathId));
  const removed = lesson.pathLessons.filter((link) => !wanted.has(link.pathId));
  if (added.length === 0 && removed.length === 0) return { ok: true };

  const addedPaths =
    added.length === 0
      ? []
      : await prisma.path.findMany({
          where: { id: { in: added }, audience: "CATALOGUE" },
          select: { id: true, refCode: true },
        });
  if (addedPaths.length !== added.length) {
    return {
      error: "Un des parcours choisis n'existe plus ou n'est pas un parcours du catalogue.",
    };
  }
  const refCodeOf = new Map(addedPaths.map((path) => [path.id, path.refCode]));

  try {
    await prisma.$transaction(async (tx) => {
      for (const link of removed) await pathRepository.detachLesson(link.pathId, lesson.id, tx);
      for (const pathId of added) await pathRepository.attachLesson(pathId, lesson.id, tx);
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "lesson.paths",
          targetType: "Lesson",
          targetId: lesson.id,
          metadata: {
            refCode: lesson.refCode,
            added: added.map((pathId) => refCodeOf.get(pathId) ?? pathId),
            removed: removed.map((link) => link.path.refCode),
          },
        },
      });
    });
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "lesson paths update failed");
    return { error: "Les parcours n'ont pas pu être enregistrés." };
  }

  revalidateLesson(lesson.id);
  revalidatePath("/paths");
  for (const pathId of [...added, ...removed.map((link) => link.pathId)]) {
    revalidatePath(`/paths/${pathId}/edit`);
  }
  return { ok: true };
}

// ── Prerequisites ─────────────────────────────────────────────────────────────

/**
 * Gives a lesson exactly these prerequisites.
 *
 * Refused when the lesson would require itself, directly or through other
 * lessons: nobody could ever open it. The check reads the links inside the
 * transaction that replaces them. The sync rewrites a lesson's prerequisites
 * from its file, so a change made here lasts until the file says otherwise.
 */
export async function setLessonPrerequisitesAction(
  lessonId: string,
  prerequisiteIds: string[],
): Promise<LessonLinksResult> {
  const admin = await requireAdminAction();

  const id = z.guid().safeParse(lessonId);
  if (!id.success) return { error: "Leçon invalide." };
  const ids = lessonPrerequisiteIdsSchema.safeParse(prerequisiteIds);
  if (!ids.success) return { error: ids.error.issues[0]?.message ?? "Prérequis invalides." };
  if (ids.data.includes(id.data)) {
    return { error: "Une leçon ne peut pas être son propre prérequis." };
  }

  const [lesson, chosen] = await Promise.all([
    prisma.lesson.findUnique({
      where: { id: id.data },
      select: {
        id: true,
        refCode: true,
        audience: true,
        prerequisites: { select: { prerequisite: { select: { refCode: true } } } },
      },
    }),
    ids.data.length === 0
      ? Promise.resolve([])
      : prisma.lesson.findMany({
          where: { id: { in: ids.data } },
          select: { id: true, refCode: true, audience: true },
        }),
  ]);
  if (!lesson) return { error: "Leçon introuvable." };
  if (chosen.length !== ids.data.length) return { error: "Une des leçons choisies n'existe plus." };
  // A class lesson opens for its classes only: required by a catalogue lesson,
  // it would close that lesson to everyone else.
  if (lesson.audience === "CATALOGUE" && chosen.some((l) => l.audience !== "CATALOGUE")) {
    return { error: "Une leçon du catalogue ne peut pas exiger une leçon de classe." };
  }
  const refCodeOf = new Map(chosen.map((l) => [l.id, l.refCode]));

  let cycle: string[] | null;
  try {
    cycle = await prisma.$transaction(async (tx) => {
      const found = findPrerequisiteCycle(
        lesson.id,
        ids.data,
        await lessonRepository.findPrerequisiteEdges(tx),
      );
      if (found) return found;
      await lessonRepository.replacePrerequisites(lesson.id, ids.data, tx);
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "lesson.prerequisites",
          targetType: "Lesson",
          targetId: lesson.id,
          metadata: {
            refCode: lesson.refCode,
            before: lesson.prerequisites.map((p) => p.prerequisite.refCode).sort(),
            after: ids.data.map((pid) => refCodeOf.get(pid) ?? pid).sort(),
          },
        },
      });
      return null;
    });
  } catch (error) {
    logger.error(
      { scope: "admin", err: errorMessage(error) },
      "lesson prerequisites update failed",
    );
    return { error: "Les prérequis n'ont pas pu être enregistrés." };
  }

  if (cycle) {
    const named = await prisma.lesson.findMany({
      where: { id: { in: cycle } },
      select: { id: true, refCode: true },
    });
    const codeOf = new Map(named.map((l) => [l.id, l.refCode]));
    return {
      error: `Ces prérequis forment une boucle : ${cycle.map((cid) => codeOf.get(cid) ?? cid).join(" → ")}. Aucune de ces leçons ne pourrait s'ouvrir.`,
    };
  }

  revalidateLesson(lesson.id);
  return { ok: true };
}
