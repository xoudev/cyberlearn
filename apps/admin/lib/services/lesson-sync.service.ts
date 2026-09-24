import crypto from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { prisma } from "@cyberlearn/db";
import { extractLessonQuizzes } from "@cyberlearn/lib/mdx-quizzes";
import { importLessonMetadataSchema, type ImportValidationError } from "@cyberlearn/types";
import { diffHunks, diffLines, diffStats, type DiffHunk } from "@/lib/text-diff";
import { checkLessonFile } from "./lesson-import.service";

/**
 * Updating lessons already in the database from their files in the repository.
 *
 * The site reads a lesson from the database, where the import put it. The
 * import refuses a refCode that exists, so a correction made to a file after
 * its import (the em dashes taken out, a quiz given its id) never reached the
 * site. This compares every file of content/lessons with its lesson, shows
 * what would change, and writes only what the admin confirms.
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

const FIELD_LABELS = {
  title: "Titre",
  description: "Description",
  category: "Domaine",
  difficulty: "Difficulté",
  estimatedMinutes: "Durée (min)",
  xpReward: "XP",
  prerequisites: "Prérequis",
} as const;

type FieldKey = keyof typeof FIELD_LABELS;

/** The part of a lesson a file can change. Slug, status and cover stay the console's. */
interface LessonFields {
  contentMdx: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  xpReward: number;
  /** refCodes, sorted. */
  prerequisites: string[];
}

export interface FieldChange {
  field: FieldKey;
  label: string;
  before: string;
  after: string;
}

export interface QuizImpact {
  quizId: string;
  /** Answers already recorded, which were given to the old version. */
  answers: number;
  change: "modified" | "removed";
}

export interface LessonUpdate {
  lessonId: string;
  refCode: string;
  file: string;
  title: string;
  status: string;
  /** Fingerprint of the lesson as shown: the update is refused if it moved since. */
  hash: string;
  fields: FieldChange[];
  hunks: DiffHunk[];
  added: number;
  removed: number;
  quizImpacts: QuizImpact[];
  /** Last edit in the console since the lesson last came from a file, if any. */
  editedInConsoleAt: Date | null;
  /** The slug is never changed by an update: links to the lesson would break. */
  slugDiffers: { database: string; file: string } | null;
}

export interface SyncOverview {
  /** False when content/lessons did not ship with this deployment. */
  available: boolean;
  unchanged: number;
  updates: LessonUpdate[];
  notImported: { file: string; refCode: string; title: string }[];
  unreadable: { file: string; message: string }[];
}

/** The fingerprint an update is checked against. */
export function lessonHash(fields: LessonFields): string {
  return crypto.createHash("sha256").update(JSON.stringify(fields)).digest("hex");
}

function normalizeBody(body: string): string {
  return body.replace(/\r\n?/g, "\n").trim();
}

interface ParsedFile {
  file: string;
  refCode: string;
  slug: string;
  fields: LessonFields;
}

/** The file's fields, read from its frontmatter only. The full check runs on update. */
function parseFile(f: RepositoryLessonFile): ParsedFile | { file: string; message: string } {
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(f.content);
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
  const m = meta.data;
  return {
    file: f.file,
    refCode: m.refCode,
    slug: m.slug,
    fields: {
      contentMdx: normalizeBody(parsed.content),
      title: m.title,
      description: m.description,
      category: m.category,
      difficulty: m.difficulty,
      estimatedMinutes: m.estimatedMinutes,
      xpReward: m.xpReward,
      prerequisites: [...m.prerequisites].sort(),
    },
  };
}

const LESSON_SELECT = {
  id: true,
  refCode: true,
  slug: true,
  status: true,
  updatedAt: true,
  contentMdx: true,
  title: true,
  description: true,
  category: true,
  difficulty: true,
  estimatedMinutes: true,
  xpReward: true,
  prerequisites: { select: { prerequisite: { select: { refCode: true } } } },
} as const;

interface LessonRow {
  id: string;
  refCode: string;
  slug: string;
  status: string;
  updatedAt: Date;
  contentMdx: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  xpReward: number;
  prerequisites: { prerequisite: { refCode: string } }[];
}

function fieldsOf(row: LessonRow): LessonFields {
  return {
    contentMdx: normalizeBody(row.contentMdx),
    title: row.title,
    description: row.description,
    category: row.category,
    difficulty: row.difficulty,
    estimatedMinutes: row.estimatedMinutes,
    xpReward: row.xpReward,
    prerequisites: row.prerequisites.map((p) => p.prerequisite.refCode).sort(),
  };
}

function fieldChanges(before: LessonFields, after: LessonFields): FieldChange[] {
  const keys = Object.keys(FIELD_LABELS) as FieldKey[];
  return keys.flatMap((field) => {
    const b = before[field];
    const a = after[field];
    const bs = Array.isArray(b) ? b.join(", ") : String(b);
    const as = Array.isArray(a) ? a.join(", ") : String(a);
    return bs === as
      ? []
      : [{ field, label: FIELD_LABELS[field], before: bs || "aucun", after: as || "aucun" }];
  });
}

/** Quizzes whose options or answer key the update changes. */
function changedQuizzes(before: string, after: string): Map<string, QuizImpact["change"]> {
  const next = new Map(extractLessonQuizzes(after).map((q) => [q.id, q]));
  const out = new Map<string, QuizImpact["change"]>();
  for (const q of extractLessonQuizzes(before)) {
    const n = next.get(q.id);
    if (!n) out.set(q.id, "removed");
    else if (n.correct !== q.correct || JSON.stringify(n.options) !== JSON.stringify(q.options)) {
      out.set(q.id, "modified");
    }
  }
  return out;
}

/** Every file of the repository against its lesson. Reads, writes nothing. */
export async function lessonSyncOverview(dir = findLessonsDir()): Promise<SyncOverview> {
  const empty: SyncOverview = {
    available: false,
    unchanged: 0,
    updates: [],
    notImported: [],
    unreadable: [],
  };
  if (dir === null) return empty;

  const files = await readRepositoryLessons(dir);
  const parsed = files.map(parseFile);
  const readable = parsed.filter((p): p is ParsedFile => "refCode" in p);
  const unreadable = parsed.filter(
    (p): p is { file: string; message: string } => !("refCode" in p),
  );

  const rows: LessonRow[] = await prisma.lesson.findMany({
    where: { refCode: { in: readable.map((p) => p.refCode) } },
    select: LESSON_SELECT,
  });
  const byRefCode = new Map(rows.map((r) => [r.refCode, r]));

  let unchanged = 0;
  const notImported: SyncOverview["notImported"] = [];
  const pending: { file: ParsedFile; row: LessonRow; before: LessonFields }[] = [];
  for (const file of readable) {
    const row = byRefCode.get(file.refCode);
    if (!row) {
      notImported.push({ file: file.file, refCode: file.refCode, title: file.fields.title });
      continue;
    }
    const before = fieldsOf(row);
    if (lessonHash(before) === lessonHash(file.fields)) unchanged++;
    else pending.push({ file, row, before });
  }

  const ids = pending.map((p) => p.row.id);
  const [answerCounts, history] =
    ids.length === 0
      ? [[], []]
      : await Promise.all([
          prisma.lessonQuizAnswer.groupBy({
            by: ["lessonId", "quizId"],
            where: { lessonId: { in: ids } },
            _count: { _all: true },
          }),
          prisma.auditLog.findMany({
            where: {
              targetId: { in: ids },
              action: { in: ["lesson.update", "lesson.sync", "lesson.import.success"] },
            },
            orderBy: { createdAt: "desc" },
            select: { targetId: true, action: true, createdAt: true },
          }),
        ]);

  const answers = new Map(
    answerCounts.map((c) => [`${c.lessonId}:${c.quizId}`, c._count._all] as const),
  );
  // Reading a lesson's quizzes parses its MDX, twice per lesson: only worth it
  // where somebody answered one. On 189 changed lessons, parsing them all took
  // most of a ten-second page load.
  const answered = new Set(answerCounts.map((c) => c.lessonId));
  // The newest entry per lesson: an edit only matters if nothing came from a file since.
  const latest = new Map<string, { action: string; createdAt: Date }>();
  for (const h of history) {
    if (h.targetId !== null && !latest.has(h.targetId)) latest.set(h.targetId, h);
  }

  const updates: LessonUpdate[] = pending.map(({ file, row, before }) => {
    const lines = diffLines(before.contentMdx, file.fields.contentMdx);
    const { added, removed } = diffStats(lines);
    const quizImpacts: QuizImpact[] = [];
    if (answered.has(row.id)) {
      for (const [quizId, change] of changedQuizzes(before.contentMdx, file.fields.contentMdx)) {
        const n = answers.get(`${row.id}:${quizId}`) ?? 0;
        if (n > 0) quizImpacts.push({ quizId, answers: n, change });
      }
    }
    const last = latest.get(row.id);
    return {
      lessonId: row.id,
      refCode: row.refCode,
      file: file.file,
      title: row.title,
      status: row.status,
      hash: lessonHash(before),
      fields: fieldChanges(before, file.fields),
      hunks: diffHunks(before.contentMdx, file.fields.contentMdx, 2),
      added,
      removed,
      quizImpacts,
      editedInConsoleAt: last?.action === "lesson.update" ? last.createdAt : null,
      slugDiffers: row.slug === file.slug ? null : { database: row.slug, file: file.slug },
    };
  });

  return { available: true, unchanged, updates, notImported, unreadable };
}

export type ApplyResult =
  | { ok: true; lessonId: string }
  | {
      ok: false;
      reason: "unavailable" | "not_found" | "stale" | "invalid" | "prerequisite";
      message: string;
      errors?: ImportValidationError[];
    };

/**
 * Writes one lesson from its file, after the same checks as an import.
 *
 * `expectedHash` is the fingerprint the admin saw: if the lesson changed
 * since (an edit in another tab), nothing is written. The write itself is
 * conditioned on the row's updatedAt, in the same statement, so an edit
 * landing between the check and the write cannot be overwritten either.
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
  const source = files
    .map((f) => ({ f, p: parseFile(f) }))
    .find(({ p }) => "refCode" in p && p.refCode === refCode);
  if (!source) {
    return {
      ok: false,
      reason: "not_found",
      message: `Aucun fichier du dépôt ne déclare ${refCode}.`,
    };
  }

  const check = await checkLessonFile(source.f.content);
  if (!check.ok) {
    return {
      ok: false,
      reason: "invalid",
      message: `${source.f.file} ne passe pas les contrôles de l'import.`,
      errors: check.errors,
    };
  }

  const row: LessonRow | null = await prisma.lesson.findUnique({
    where: { refCode },
    select: LESSON_SELECT,
  });
  if (!row) {
    return {
      ok: false,
      reason: "not_found",
      message: `${refCode} n'est pas en base : importe-la d'abord.`,
    };
  }
  if (lessonHash(fieldsOf(row)) !== expectedHash) {
    return {
      ok: false,
      reason: "stale",
      message:
        "La leçon a changé depuis l'affichage. Recharge la page pour voir les différences à jour.",
    };
  }

  const m = check.metadata;
  const prereqs = await prisma.lesson.findMany({
    where: { refCode: { in: m.prerequisites } },
    select: { id: true, refCode: true },
  });
  const missing = m.prerequisites.filter((r) => !prereqs.some((p) => p.refCode === r));
  if (missing.length > 0) {
    return {
      ok: false,
      reason: "prerequisite",
      message: `Prérequis absent de la base : ${missing.join(", ")}. Importe-le d'abord.`,
    };
  }

  const body = normalizeBody(check.body);
  const written = await prisma.$transaction(async (tx) => {
    const { count } = await tx.lesson.updateMany({
      where: { id: row.id, updatedAt: row.updatedAt },
      data: {
        contentMdx: body,
        title: m.title,
        description: m.description,
        category: m.category,
        difficulty: m.difficulty,
        estimatedMinutes: m.estimatedMinutes,
        xpReward: m.xpReward,
      },
    });
    if (count !== 1) return false;
    await tx.lessonPrerequisite.deleteMany({ where: { lessonId: row.id } });
    if (prereqs.length > 0) {
      await tx.lessonPrerequisite.createMany({
        data: prereqs.map((p) => ({ lessonId: row.id, prerequisiteId: p.id })),
      });
    }
    await tx.auditLog.create({
      data: {
        actorId,
        action: "lesson.sync",
        targetType: "lesson",
        targetId: row.id,
        metadata: {
          refCode,
          file: source.f.file,
          contentHash: crypto.createHash("sha256").update(body).digest("hex"),
        },
      },
    });
    return true;
  });

  if (!written) {
    return {
      ok: false,
      reason: "stale",
      message: "La leçon a été modifiée pendant la mise à jour. Recharge la page.",
    };
  }
  return { ok: true, lessonId: row.id };
}
