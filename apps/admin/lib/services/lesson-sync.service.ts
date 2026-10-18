import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { lessonFileRepository } from "@cyberlearn/db";
import {
  importLessonMetadataSchema,
  type LessonFieldChange,
  type LessonQuizImpact,
  type LessonUpdatePreview,
} from "@cyberlearn/types";
import { orderBatchByPrerequisites } from "./lesson-import.service";
import {
  applyLessonContentUpdate,
  compareLesson,
  fieldsOfFile,
  fieldsOfRow,
  lessonHash,
  type ApplyResult,
  type LessonFields,
} from "./lesson-update.service";

export { lessonHash, type ApplyResult };

/**
 * Updating lessons already in the database from their files in the repository.
 *
 * The site reads a lesson from the database, where the import put it. A
 * correction made to a file after its import (the em dashes taken out, a quiz
 * given its id) does not reach the site by itself. This compares every file
 * of content/lessons with its lesson, shows what would change, and writes
 * only what the admin confirms (lesson-update.service.ts, shared with the
 * import of a file whose refCode is taken).
 *
 * The files ship with the admin's deployment (outputFileTracingIncludes in
 * next.config.ts), so nobody has to download and upload them.
 */

/** Where content/lessons is, from wherever the app runs; null if it did not ship. */
export function findLessonsDir(start = process.cwd()): string | null {
  let dir = start;
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, "content", "lessons");
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export interface RepositoryLessonFile {
  /** Path under content/lessons, e.g. "python/05-listes-tuples.mdx". */
  file: string;
  content: string;
}

export async function readRepositoryLessons(dir: string): Promise<RepositoryLessonFile[]> {
  const out: RepositoryLessonFile[] = [];
  const walk = async (sub: string): Promise<void> => {
    const entries = await readdir(path.join(dir, sub), { withFileTypes: true });
    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const rel = sub === "" ? e.name : `${sub}/${e.name}`;
      if (e.isDirectory()) await walk(rel);
      else if (e.name.endsWith(".mdx")) {
        out.push({ file: rel, content: await readFile(path.join(dir, rel), "utf8") });
      }
    }
  };
  await walk("");
  return out;
}

export type FieldChange = LessonFieldChange;
export type QuizImpact = LessonQuizImpact;

/** A lesson its file would change, and the file it comes from. */
export interface LessonUpdate extends LessonUpdatePreview {
  /** Path under content/lessons. */
  file: string;
}

export interface SyncOverview {
  /** False when content/lessons did not ship with this deployment. */
  available: boolean;
  unchanged: number;
  updates: LessonUpdate[];
  /** In an order where each lesson follows its prerequisites: the import order. */
  notImported: { file: string; refCode: string; title: string }[];
  unreadable: { file: string; message: string }[];
  /**
   * Catalogue lessons no file of the repository holds: written in the
   * console, or their file taken out. The sync never touches them, and never
   * deletes a lesson: the database is what the site reads.
   */
  onlyInDatabase: { lessonId: string; refCode: string; title: string; status: string }[];
}

/**
 * The refCode a file declares, read off its frontmatter even when the file is
 * unreadable otherwise: its lesson has a file, broken as it may be.
 */
function declaredRefCode(content: string): string | null {
  return /^refCode:\s*["']?([^"'\s]+)/m.exec(content)?.[1] ?? null;
}

interface ParsedFile {
  file: string;
  refCode: string;
  slug: string;
  fields: LessonFields;
}

/**
 * The file's fields, read from its frontmatter only. The full check runs on
 * update. A file refused here is listed as unreadable and never imported, so
 * neither is any lesson that needs it.
 */
export function readLessonFile(
  f: RepositoryLessonFile,
): ParsedFile | { file: string; message: string } {
  let parsed: matter.GrayMatterFile<string>;
  try {
    // Options, even empty, keep gray-matter from caching the file before it
    // parses it: a frontmatter it could not read would read as empty the
    // next time the page loads.
    parsed = matter(f.content, {});
  } catch (e) {
    return {
      file: f.file,
      message: `Frontmatter illisible : ${e instanceof Error ? e.message : ""}`,
    };
  }
  const meta = importLessonMetadataSchema.safeParse(parsed.data);
  if (!meta.success) {
    const issue = meta.error.issues[0];
    return {
      file: f.file,
      message: `Frontmatter invalide : ${issue ? `${issue.path.join(".")} ${issue.message}` : ""}`,
    };
  }
  return {
    file: f.file,
    refCode: meta.data.refCode,
    slug: meta.data.slug,
    fields: fieldsOfFile(meta.data, parsed.content),
  };
}

/** Every file of the repository against its lesson. Reads, writes nothing. */
export async function lessonSyncOverview(dir = findLessonsDir()): Promise<SyncOverview> {
  const empty: SyncOverview = {
    available: false,
    unchanged: 0,
    updates: [],
    notImported: [],
    unreadable: [],
    onlyInDatabase: [],
  };
  if (dir === null) return empty;

  const files = await readRepositoryLessons(dir);
  const parsed = files.map(readLessonFile);
  const readable = parsed.filter((p): p is ParsedFile => "refCode" in p);
  const unreadable = parsed.filter(
    (p): p is { file: string; message: string } => !("refCode" in p),
  );

  const declared = [
    ...new Set([
      ...readable.map((p) => p.refCode),
      ...files.flatMap((f) => declaredRefCode(f.content) ?? []),
    ]),
  ];
  const [rows, outside] = await Promise.all([
    lessonFileRepository.findByRefCodes(readable.map((p) => p.refCode)),
    lessonFileRepository.catalogueLessonsOutside(declared),
  ]);
  const byRefCode = new Map(rows.map((r) => [r.refCode, r]));

  let unchanged = 0;
  const missing: ParsedFile[] = [];
  const pending: { file: ParsedFile; row: (typeof rows)[number] }[] = [];
  for (const file of readable) {
    const row = byRefCode.get(file.refCode);
    if (!row) {
      missing.push(file);
      continue;
    }
    if (lessonHash(fieldsOfRow(row)) === lessonHash(file.fields)) unchanged++;
    else pending.push({ file, row });
  }

  // Imported one by one, a lesson whose prerequisite is not in yet would be
  // refused: list them so that each comes after the lessons it needs. A cycle
  // cannot be ordered; its lessons come last, where their import will say why.
  const { ordered, cyclic } = orderBatchByPrerequisites(
    missing.map((f) => ({ id: f.file, refCode: f.refCode, prerequisites: f.fields.prerequisites })),
  );
  const byFile = new Map(missing.map((f) => [f.file, f]));
  const notImported = [...ordered, ...cyclic].flatMap((id) => {
    const f = byFile.get(id);
    return f ? [{ file: f.file, refCode: f.refCode, title: f.fields.title }] : [];
  });

  const ids = pending.map((p) => p.row.id);
  const [answerCounts, edits, drafts] = await Promise.all([
    lessonFileRepository.quizAnswerCounts(ids),
    lessonFileRepository.consoleEditsSinceFile(ids),
    lessonFileRepository.openDrafts(ids),
  ]);
  const answers = new Map<string, Map<string, number>>();
  for (const c of answerCounts) {
    const own = answers.get(c.lessonId) ?? new Map<string, number>();
    own.set(c.quizId, c.answers);
    answers.set(c.lessonId, own);
  }

  const updates: LessonUpdate[] = pending.map(({ file, row }) => ({
    ...compareLesson(row, file, {
      answers: answers.get(row.id) ?? new Map(),
      editedInConsoleAt: edits.get(row.id) ?? null,
      draftSavedAt: drafts.get(row.id) ?? null,
    }),
    file: file.file,
  }));

  const onlyInDatabase = outside.map((l) => ({
    lessonId: l.id,
    refCode: l.refCode,
    title: l.title,
    status: l.status,
  }));

  return { available: true, unchanged, updates, notImported, unreadable, onlyInDatabase };
}

/**
 * Writes one lesson from its file in the repository, after the same checks
 * as an import, if it is still as the admin saw it (`expectedHash`).
 */
export async function applyLessonUpdate(
  refCode: string,
  expectedHash: string,
  actorId: string,
  dir = findLessonsDir(),
): Promise<ApplyResult> {
  if (dir === null) {
    return {
      ok: false,
      reason: "unavailable",
      message: "Les fichiers du dépôt ne sont pas disponibles ici.",
    };
  }

  const files = await readRepositoryLessons(dir);
  const source = files.find((f) => {
    const p = readLessonFile(f);
    return "refCode" in p && p.refCode === refCode;
  });
  if (!source) {
    return {
      ok: false,
      reason: "not_found",
      message: `Aucun fichier du dépôt ne déclare ${refCode}.`,
    };
  }

  return applyLessonContentUpdate(source.content, expectedHash, actorId, {
    kind: "repository",
    file: source.file,
  });
}
