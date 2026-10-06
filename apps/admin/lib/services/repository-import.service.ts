import crypto from "node:crypto";
import matter from "gray-matter";
import { prisma } from "@cyberlearn/db";
import {
  catalogueFromManifest,
  ChallengeSyncError,
  challengeMatches,
  findChallengeDir,
  loadChallengeFiles,
  syncChallenge,
  findPathManifestDir,
  findQuizDir,
  loadPathManifests,
  loadQuizFiles,
  manifestLessons,
  quizMatches,
  syncPath,
  syncQuiz,
  type LoadedPathManifest,
} from "@cyberlearn/db/catalogue";
import type { ImportValidationError } from "@cyberlearn/types";
import { importValidatedLesson, validateMdxContent } from "./lesson-import.service";
import {
  findLessonsDir,
  readLessonFile,
  readRepositoryLessons,
  type RepositoryLessonFile,
} from "./lesson-sync.service";

/**
 * Bringing what the repository holds into the database, from the console.
 *
 * Until now a lesson reached production only by being uploaded on the import
 * page, file by file, and a path of the new catalogue (content/paths) or its
 * final exam (content/quizzes) only by running seed-paths or seed-quizzes
 * against the production database from someone's machine. These files ship
 * with the console's deployment (outputFileTracingIncludes in next.config.ts),
 * so the console can read them itself: a lesson is imported through the same
 * checks as an upload, and a path or an exam is written by the same code as
 * the seeds (@cyberlearn/db/catalogue).
 *
 * Nothing is published here. Lessons arrive as DRAFT, like any import, and a
 * new path as DRAFT too: publishing stays a decision taken in the console.
 */

// ── Lessons ──────────────────────────────────────────────────────────────────

export type RepositoryImportResult =
  | { ok: true; lessonId: string }
  | {
      ok: false;
      reason: "unavailable" | "not_found" | "invalid" | "conflict";
      message: string;
      errors?: ImportValidationError[];
    };

function declaredRefCode(content: string): string | null {
  try {
    const data: unknown = matter(content).data;
    if (typeof data === "object" && data !== null && "refCode" in data) {
      return typeof data.refCode === "string" ? data.refCode : null;
    }
  } catch {
    // An unreadable frontmatter declares nothing; the overview reports it.
  }
  return null;
}

const MISSING_PREREQUISITE = /^Prerequis introuvable: (\S+)$/;

/**
 * Says why a prerequisite is missing, from the repository's own files: no file
 * declares it, its file is refused before it can be imported (the reason
 * given), or it is simply not imported yet. "Introuvable" alone sent people
 * looking for a lesson that was in the repository all along, under a
 * frontmatter the sync could not read.
 */
function explainMissingPrerequisites(
  errors: ImportValidationError[],
  files: RepositoryLessonFile[],
): ImportValidationError[] {
  return errors.map((error) => {
    const missing =
      error.field === "prerequisites" ? MISSING_PREREQUISITE.exec(error.message) : null;
    const refCode = missing?.[1];
    if (refCode === undefined) return error;
    const source = files.find((f) => declaredRefCode(f.content) === refCode);
    if (!source) {
      return { ...error, message: `${error.message} (aucun fichier du dépôt ne la déclare)` };
    }
    const read = readLessonFile(source);
    const why =
      "refCode" in read
        ? `son fichier, ${source.file}, n'est pas encore importé : importe-le d'abord`
        : `son fichier, ${source.file}, est refusé par l'import (${read.message})`;
    return { ...error, message: `${error.message} : ${why}` };
  });
}

/** Prisma's unique-constraint error, recognised without importing the runtime. */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

/**
 * Imports the lesson a repository file declares, as DRAFT.
 *
 * The file goes through validateMdxContent, the whole import pipeline: the
 * frontmatter, the MDX check and compile, a refCode or slug already taken, and
 * prerequisites that must already be in the database. The page imports new
 * lessons in prerequisite order, so a lesson's prerequisites land before it.
 */
export async function importLessonFromRepository(
  refCode: string,
  actorId: string,
  dir = findLessonsDir(),
): Promise<RepositoryImportResult> {
  if (dir === null) {
    return {
      ok: false,
      reason: "unavailable",
      message: "Les fichiers du dépôt ne sont pas disponibles ici.",
    };
  }

  const files = await readRepositoryLessons(dir);
  const source = files.find((f) => declaredRefCode(f.content) === refCode);
  if (!source) {
    return {
      ok: false,
      reason: "not_found",
      message: `Aucun fichier du dépôt ne déclare ${refCode}.`,
    };
  }

  const result = await validateMdxContent(source.content);
  if (!result.valid || !result.metadata || result.body === undefined) {
    return {
      ok: false,
      reason: "invalid",
      message: `${source.file} ne passe pas les contrôles de l'import.`,
      errors: explainMissingPrerequisites(result.errors, files),
    };
  }

  let lessonId: string;
  try {
    ({ lessonId } = await importValidatedLesson(result.metadata, result.body, actorId));
  } catch (error) {
    // Two tabs importing the same file: the second finds the row the first wrote.
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        reason: "conflict",
        message: `${refCode} vient d'être importée ailleurs. Recharge la page.`,
      };
    }
    throw error;
  }

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "lesson.import.success",
      targetType: "lesson",
      targetId: lessonId,
      metadata: {
        refCode,
        contentHash: crypto.createHash("sha256").update(source.content).digest("hex"),
        source: "repository",
        file: source.file,
      },
    },
  });
  return { ok: true, lessonId };
}

// ── Paths ────────────────────────────────────────────────────────────────────

export interface PathSyncState {
  refCode: string;
  slug: string;
  title: string;
  /** The manifest, under content/paths. */
  file: string;
  modules: number;
  lessons: number;
  /** Lessons of the manifest already in the database: the ones a sync attaches. */
  importedLessons: number;
  /** The path in the database, if it exists. */
  database: { id: string; status: string } | null;
  /** The database already holds what a sync would write. */
  upToDate: boolean;
}

export interface PathSyncOverview {
  /** False when content/paths did not ship with this deployment. */
  available: boolean;
  /** A manifest that fails its check stops every path sync until it is fixed. */
  errors: string[];
  paths: PathSyncState[];
}

const PATH_SELECT = {
  id: true,
  refCode: true,
  status: true,
  title: true,
  description: true,
  category: true,
  track: true,
  difficulty: true,
  estimatedHours: true,
  modules: {
    orderBy: { position: "asc" },
    select: { position: true, title: true, description: true },
  },
  lessons: {
    orderBy: { position: "asc" },
    select: {
      lesson: { select: { refCode: true } },
      module: { select: { position: true } },
    },
  },
} as const;

interface PathRow {
  id: string;
  refCode: string;
  status: string;
  title: string;
  description: string;
  category: string;
  track: string;
  difficulty: string;
  estimatedHours: number;
  modules: { position: number; title: string; description: string | null }[];
  lessons: { lesson: { refCode: string }; module: { position: number } | null }[];
}

/**
 * Whether the row already holds what syncPath would write. Links past the
 * manifest's own are ignored: the sync keeps them at the end on purpose (a
 * lesson taken out of a manifest is not taken away from its readers), so they
 * would otherwise mark the path out of date forever.
 */
function isUpToDate(row: PathRow, loaded: LoadedPathManifest, imported: Set<string>): boolean {
  const target = catalogueFromManifest(loaded.manifest);
  const sameFields =
    row.title === target.title &&
    row.description === target.description &&
    row.category === target.category &&
    row.track === target.track &&
    row.difficulty === target.difficulty &&
    row.estimatedHours === target.estimatedHours;
  const sameModules =
    row.modules.length === target.modules.length &&
    target.modules.every((m, i) => {
      const saved = row.modules[i];
      return (
        saved?.position === i + 1 && saved.title === m.title && saved.description === m.description
      );
    });
  const expected = target.lessons.filter((l) => imported.has(l.refCode));
  const sameLessons = expected.every((l, i) => {
    const link = row.lessons[i];
    const modulePosition = l.moduleIndex === null ? null : l.moduleIndex + 1;
    return link?.lesson.refCode === l.refCode && (link.module?.position ?? null) === modulePosition;
  });
  return sameFields && sameModules && sameLessons;
}

/** Every manifest of content/paths against its path. Reads, writes nothing. */
export async function pathSyncOverview(dir = findPathManifestDir()): Promise<PathSyncOverview> {
  if (dir === null) return { available: false, errors: [], paths: [] };
  const { manifests, errors } = loadPathManifests(dir);

  const refCodes = manifests.flatMap(({ manifest }) =>
    manifestLessons(manifest).map((l) => l.refCode),
  );
  const [lessons, rows] = await Promise.all([
    prisma.lesson.findMany({ where: { refCode: { in: refCodes } }, select: { refCode: true } }),
    prisma.path.findMany({
      where: { refCode: { in: manifests.map(({ manifest }) => manifest.refCode) } },
      select: PATH_SELECT,
    }),
  ]);
  const imported = new Set(lessons.map((l) => l.refCode));
  const byRefCode = new Map<string, PathRow>(rows.map((r) => [r.refCode, r]));

  const paths = manifests.map((loaded): PathSyncState => {
    const { manifest, file } = loaded;
    const own = manifestLessons(manifest);
    const row = byRefCode.get(manifest.refCode);
    return {
      refCode: manifest.refCode,
      slug: manifest.slug,
      title: manifest.title,
      file,
      modules: manifest.modules.length,
      lessons: own.length,
      importedLessons: own.filter((l) => imported.has(l.refCode)).length,
      database: row ? { id: row.id, status: row.status } : null,
      upToDate: row !== undefined && isUpToDate(row, loaded, imported),
    };
  });
  return { available: true, errors, paths };
}

export type PathSyncResult =
  | { ok: true; created: boolean; attached: number; missing: number }
  | {
      ok: false;
      reason: "unavailable" | "invalid" | "not_found";
      message: string;
      details: string[];
    };

/**
 * Writes one path of content/paths, its modules and its lesson links.
 *
 * Every manifest is checked first, not only this one: a refCode or a lesson
 * claimed by two manifests is an error of the set, and writing one of them
 * would already be writing the mistake.
 */
export async function syncPathFromRepository(
  refCode: string,
  actorId: string,
  dir = findPathManifestDir(),
): Promise<PathSyncResult> {
  if (dir === null) {
    return {
      ok: false,
      reason: "unavailable",
      message: "Les manifestes du dépôt ne sont pas disponibles ici.",
      details: [],
    };
  }
  const { manifests, errors } = loadPathManifests(dir);
  if (errors.length > 0) {
    return {
      ok: false,
      reason: "invalid",
      message: "Les manifestes de content/paths ne passent pas leurs contrôles.",
      details: errors,
    };
  }
  const loaded = manifests.find(({ manifest }) => manifest.refCode === refCode);
  if (!loaded) {
    return {
      ok: false,
      reason: "not_found",
      message: `Aucun manifeste du dépôt ne déclare ${refCode}.`,
      details: [],
    };
  }

  const result = await syncPath(prisma, catalogueFromManifest(loaded.manifest));
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "path.sync",
      targetType: "path",
      targetId: result.pathId,
      metadata: {
        refCode,
        file: loaded.file,
        created: result.created,
        attached: result.attached,
        missing: result.missing,
      },
    },
  });
  return {
    ok: true,
    created: result.created,
    attached: result.attached,
    missing: result.missing.length,
  };
}

// ── Exams ────────────────────────────────────────────────────────────────────

export interface QuizSyncState {
  /** The path's slug, which names the file. */
  slug: string;
  /** content/quizzes/<file> */
  file: string;
  questions: number;
  questionsToDraw: number;
  passThreshold: number;
  /** The path the exam belongs to; null until the path is synced. */
  path: { id: string; title: string } | null;
  /** The path has a quiz, possibly different from the file. */
  exists: boolean;
  /** The database already holds what a sync would write. */
  upToDate: boolean;
}

export interface QuizSyncOverview {
  /** False when content/quizzes did not ship with this deployment. */
  available: boolean;
  /** A file that fails its check is listed here and cannot be synced. */
  errors: string[];
  quizzes: QuizSyncState[];
}

/** Every exam of content/quizzes against its path's quiz. Reads, writes nothing. */
export async function quizSyncOverview(dir = findQuizDir()): Promise<QuizSyncOverview> {
  if (dir === null) return { available: false, errors: [], quizzes: [] };
  const { quizzes, errors } = loadQuizFiles(dir);
  const paths = await prisma.path.findMany({
    where: { slug: { in: quizzes.map((q) => q.slug) } },
    select: {
      id: true,
      slug: true,
      title: true,
      quiz: {
        select: {
          passThreshold: true,
          questionsToDraw: true,
          isActive: true,
          questions: {
            orderBy: { orderIndex: "asc" },
            select: {
              question: true,
              options: true,
              correctOptionId: true,
              explanation: true,
              isActive: true,
            },
          },
        },
      },
    },
  });
  const bySlug = new Map(paths.map((p) => [p.slug, p]));

  return {
    available: true,
    errors,
    quizzes: quizzes.map(({ slug, file, quiz }): QuizSyncState => {
      const path = bySlug.get(slug);
      return {
        slug,
        file,
        questions: quiz.questions.length,
        questionsToDraw: quiz.questionsToDraw,
        passThreshold: quiz.passThreshold,
        path: path ? { id: path.id, title: path.title } : null,
        exists: Boolean(path?.quiz),
        upToDate: path?.quiz ? quizMatches(path.quiz, quiz) : false,
      };
    }),
  };
}

export type QuizSyncResult =
  | { ok: true; created: boolean; questions: number }
  | {
      ok: false;
      reason: "unavailable" | "invalid" | "not_found" | "no_path";
      message: string;
      details: string[];
    };

/**
 * Writes the exam of one path from content/quizzes/<slug>.json: its threshold,
 * its draw and its whole question pool. The path must exist: an exam is
 * attached to a path, so the path is synced first.
 */
export async function syncQuizFromRepository(
  slug: string,
  actorId: string,
  dir = findQuizDir(),
): Promise<QuizSyncResult> {
  if (dir === null) {
    return {
      ok: false,
      reason: "unavailable",
      message: "Les examens du dépôt ne sont pas disponibles ici.",
      details: [],
    };
  }
  const { quizzes, errors } = loadQuizFiles(dir);
  const own = errors.filter((e) => e.startsWith(`[${slug}]`));
  if (own.length > 0) {
    return {
      ok: false,
      reason: "invalid",
      message: `content/quizzes/${slug}.json ne passe pas ses contrôles.`,
      details: own,
    };
  }
  const loaded = quizzes.find((q) => q.slug === slug);
  if (!loaded) {
    return {
      ok: false,
      reason: "not_found",
      message: `Aucun examen du dépôt pour le parcours ${slug}.`,
      details: [],
    };
  }
  const path = await prisma.path.findUnique({ where: { slug }, select: { id: true } });
  if (!path) {
    return {
      ok: false,
      reason: "no_path",
      message: `Le parcours ${slug} n'existe pas encore en base : synchronise-le d'abord.`,
      details: [],
    };
  }

  const result = await syncQuiz(prisma, path.id, loaded.quiz);
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "quiz.sync",
      targetType: "quiz",
      targetId: result.quizId,
      metadata: {
        slug,
        file: loaded.file,
        created: result.created,
        questions: result.questions,
        retired: result.retired,
        questionsToDraw: loaded.quiz.questionsToDraw,
        passThreshold: loaded.quiz.passThreshold,
      },
    },
  });
  return { ok: true, created: result.created, questions: result.questions };
}

// ── Challenges ───────────────────────────────────────────────────────────────

export interface ChallengeSyncState {
  refCode: string;
  slug: string;
  title: string;
  /** content/challenges/<file> */
  file: string;
  prerequisite: string | null;
  /** In the database, under this refCode. */
  exists: boolean;
  /** Played on the site: a new challenge arrives inactive. */
  isActive: boolean;
  /** The database already holds what a sync would write. */
  upToDate: boolean;
}

export interface ChallengeSyncOverview {
  /** False when content/challenges did not ship with this deployment. */
  available: boolean;
  /** A file that fails its check is listed here and cannot be synced. */
  errors: string[];
  challenges: ChallengeSyncState[];
}

/** Every challenge of content/challenges against the database. Reads, writes nothing. */
export async function challengeSyncOverview(
  dir = findChallengeDir(),
): Promise<ChallengeSyncOverview> {
  if (dir === null) return { available: false, errors: [], challenges: [] };
  const { challenges, errors } = loadChallengeFiles(dir);
  const rows = await prisma.challenge.findMany({
    where: { refCode: { in: challenges.map((c) => c.challenge.refCode) } },
    select: {
      refCode: true,
      slug: true,
      title: true,
      description: true,
      instructions: true,
      category: true,
      difficulty: true,
      type: true,
      xpReward: true,
      maxAttempts: true,
      orderIndex: true,
      machine: true,
      isActive: true,
      prerequisite: { select: { refCode: true } },
      hints: { orderBy: { orderIndex: "asc" }, select: { content: true, xpCost: true } },
    },
  });
  const byRefCode = new Map(rows.map((r) => [r.refCode, r]));

  return {
    available: true,
    errors,
    challenges: challenges.map(({ file, challenge }): ChallengeSyncState => {
      const row = byRefCode.get(challenge.refCode);
      return {
        refCode: challenge.refCode,
        slug: challenge.slug,
        title: challenge.title,
        file,
        prerequisite: challenge.prerequisite ?? null,
        exists: row !== undefined,
        isActive: row?.isActive ?? false,
        upToDate:
          row !== undefined &&
          challengeMatches(
            { ...row, prerequisiteRefCode: row.prerequisite?.refCode ?? null },
            challenge,
          ),
      };
    }),
  };
}

export type ChallengeSyncResult =
  | { ok: true; created: boolean }
  | {
      ok: false;
      reason: "unavailable" | "invalid" | "not_found" | "refused" | "conflict";
      message: string;
      details: string[];
    };

/**
 * Writes one challenge from content/challenges: a new one arrives inactive, an
 * existing one is rewritten and stays as active as it was. Its prerequisite
 * must already be in the database: the page syncs them in file order, which
 * is the order they are played in.
 */
export async function syncChallengeFromRepository(
  refCode: string,
  actorId: string,
  dir = findChallengeDir(),
): Promise<ChallengeSyncResult> {
  if (dir === null) {
    return {
      ok: false,
      reason: "unavailable",
      message: "Les défis du dépôt ne sont pas disponibles ici.",
      details: [],
    };
  }
  const { challenges, errors } = loadChallengeFiles(dir);
  const loaded = challenges.find((c) => c.challenge.refCode === refCode);
  if (!loaded) {
    return {
      ok: false,
      reason: "not_found",
      message: `Aucun défi du dépôt n'a le refCode ${refCode}.`,
      details: [],
    };
  }
  const own = errors.filter((e) => e.startsWith(`[${loaded.file}]`));
  if (own.length > 0) {
    return {
      ok: false,
      reason: "invalid",
      message: `content/challenges/${loaded.file} ne passe pas ses contrôles.`,
      details: own,
    };
  }

  let result: Awaited<ReturnType<typeof syncChallenge>>;
  try {
    result = await syncChallenge(prisma, loaded.challenge);
  } catch (error) {
    if (error instanceof ChallengeSyncError) {
      return { ok: false, reason: "refused", message: error.message, details: [] };
    }
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        reason: "conflict",
        message: `Le slug ${loaded.challenge.slug} est déjà pris par un autre défi.`,
        details: [],
      };
    }
    throw error;
  }
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "challenge.sync",
      targetType: "challenge",
      targetId: result.challengeId,
      metadata: { refCode, file: loaded.file, created: result.created, hints: result.hints },
    },
  });
  return { ok: true, created: result.created };
}

// ── Publication ──────────────────────────────────────────────────────────────

export interface CatalogueDraft {
  id: string;
  refCode: string;
  title: string;
}

export interface CatalogueDrafts {
  lessons: CatalogueDraft[];
  paths: CatalogueDraft[];
}

/**
 * The catalogue's lessons and paths still in DRAFT: those a content/paths
 * manifest lists, and nothing else. The first catalogue, and anything a
 * teacher or an admin left in draft on purpose outside the manifests, is
 * never part of it; an ARCHIVED row is not a draft and stays archived.
 */
export async function catalogueDrafts(dir = findPathManifestDir()): Promise<CatalogueDrafts> {
  if (dir === null) return { lessons: [], paths: [] };
  const { manifests, errors } = loadPathManifests(dir);
  if (errors.length > 0) return { lessons: [], paths: [] };
  const lessonRefCodes = manifests.flatMap(({ manifest }) =>
    manifestLessons(manifest).map((l) => l.refCode),
  );
  const pathRefCodes = manifests.map(({ manifest }) => manifest.refCode);
  const select = { id: true, refCode: true, title: true } as const;
  const [lessons, paths] = await Promise.all([
    prisma.lesson.findMany({
      where: { refCode: { in: lessonRefCodes }, status: "DRAFT" },
      orderBy: { refCode: "asc" },
      select,
    }),
    prisma.path.findMany({
      where: { refCode: { in: pathRefCodes }, status: "DRAFT" },
      orderBy: { refCode: "asc" },
      select,
    }),
  ]);
  return { lessons, paths };
}

/**
 * Publishes every draft catalogueDrafts finds, lessons and paths together.
 *
 * The list is read again here, on the server, rather than taken from the
 * page: what gets published is what the manifests list at this moment. The
 * status filter sits in the update itself, so a row archived since the page
 * was drawn is not published by it.
 */
export async function publishCatalogueDrafts(
  actorId: string,
  dir = findPathManifestDir(),
): Promise<{ lessons: number; paths: number }> {
  const drafts = await catalogueDrafts(dir);
  if (drafts.lessons.length === 0 && drafts.paths.length === 0) return { lessons: 0, paths: 0 };

  const publishedAt = new Date();
  const [lessons, paths] = await prisma.$transaction([
    prisma.lesson.updateMany({
      where: { id: { in: drafts.lessons.map((l) => l.id) }, status: "DRAFT" },
      data: { status: "PUBLISHED", publishedAt },
    }),
    prisma.path.updateMany({
      where: { id: { in: drafts.paths.map((p) => p.id) }, status: "DRAFT" },
      data: { status: "PUBLISHED", publishedAt },
    }),
    prisma.auditLog.create({
      data: {
        actorId,
        action: "catalogue.publish",
        targetType: "catalogue",
        targetId: null,
        metadata: {
          lessons: drafts.lessons.map((l) => l.refCode),
          paths: drafts.paths.map((p) => p.refCode),
        },
      },
    }),
  ]);
  return { lessons: lessons.count, paths: paths.count };
}
