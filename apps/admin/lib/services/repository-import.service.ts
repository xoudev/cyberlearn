import crypto from "node:crypto";
import matter from "gray-matter";
import { prisma } from "@cyberlearn/db";
import {
  catalogueFromManifest,
  findPathManifestDir,
  loadPathManifests,
  manifestLessons,
  syncPath,
  type LoadedPathManifest,
} from "@cyberlearn/db/catalogue";
import type { ImportValidationError } from "@cyberlearn/types";
import { importValidatedLesson, validateMdxContent } from "./lesson-import.service";
import { findLessonsDir, readRepositoryLessons } from "./lesson-sync.service";

/**
 * Bringing what the repository holds into the database, from the console.
 *
 * Until now a lesson reached production only by being uploaded on the import
 * page, file by file, and a path of the new catalogue (content/paths) only by
 * running seed-paths against the production database from someone's machine.
 * Both files ship with the console's deployment (outputFileTracingIncludes in
 * next.config.ts), so the console can read them itself: a lesson is imported
 * through the same checks as an upload, and a path is written by the same code
 * as the seed (@cyberlearn/db/catalogue).
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

  const source = (await readRepositoryLessons(dir)).find(
    (f) => declaredRefCode(f.content) === refCode,
  );
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
      errors: result.errors,
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
