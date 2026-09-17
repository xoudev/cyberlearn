import type { Category, Difficulty } from "@prisma/client";
import { FOLD_ACCENTED, FOLD_PLAIN, foldText } from "@cyberlearn/lib";
import { prisma } from "../prisma.js";
import { lessonsVisibleTo } from "./lesson.repository.js";
import { pathsVisibleTo } from "./path.repository.js";

/**
 * One search across the three things a signed-in reader actually looks for:
 * the paths and lessons they may open, and their own notes.
 *
 * Two rules shape this file.
 *
 * The first is visibility. A CLASS path or lesson is PUBLISHED - the class has
 * to be able to open it - so "published" is not the question. Every result that
 * leaves here has been through pathsVisibleTo / lessonsVisibleTo, the same two
 * functions the catalogue and the slug lookups read. The raw pre-filter below
 * only ever narrows: it never decides who may see a row.
 *
 * The second is accents. This site is in French, and someone typing "securite"
 * means "sécurité". Postgres' ILIKE is case-insensitive but not
 * accent-insensitive, and unaccent() is an extension this database does not
 * have, so the fold is done with translate() - a plain built-in that works on
 * any Postgres, including the throwaway one CI migrates from empty.
 */

/**
 * How many rows the pre-filter may hand to the visibility filter. A search term
 * is selective and the catalogue is not a log table, so this is a seatbelt
 * rather than a working limit - but it is a real one: if a term ever matched
 * more than this, the results would be a subset of the matches, not all of them.
 */
const CANDIDATE_LIMIT = 200;

/** The shortest term worth a round trip. One letter matches half the site. */
export const MIN_SEARCH_LENGTH = 2;

export interface PathSearchRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  estimatedHours: number;
  lessonCount: number;
}

export interface LessonSearchRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  estimatedMinutes: number;
}

export interface NoteSearchRow {
  id: string;
  content: string;
  wordCount: number;
  updatedAt: Date;
  lessonSlug: string;
  lessonTitle: string;
  lessonCategory: Category;
}

export interface SearchRows {
  paths: PathSearchRow[];
  lessons: LessonSearchRow[];
  notes: NoteSearchRow[];
}

const EMPTY: SearchRows = { paths: [], lessons: [], notes: [] };

/**
 * The term as a LIKE pattern: folded the same way the columns are, and with
 * LIKE's own wildcards defused so a search for "100 %" is a search for a string
 * and not for everything.
 */
function pattern(term: string): string {
  const escaped = foldText(term).replace(/[\\%_]/gu, (c) => `\\${c}`);
  return `%${escaped}%`;
}

export const searchRepository = {
  /**
   * Everything matching `term` that `userId` is allowed to see, capped per kind.
   *
   * `take` is per kind and applies after the visibility filter, so a reader
   * never loses a result they may open to one they may not.
   */
  async search(userId: string, term: string, take = 24): Promise<SearchRows> {
    const trimmed = term.trim();
    if (trimmed.length < MIN_SEARCH_LENGTH) return EMPTY;
    const like = pattern(trimmed);

    // Stage one: narrow. These three queries answer "which rows contain the
    // term at all", folding accents away, and nothing else. Stage two decides
    // who may see them.
    const [pathIds, lessonIds, noteIds] = await Promise.all([
      prisma.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "paths"
        WHERE "status" = 'PUBLISHED'
          AND translate(lower("title" || ' ' || "description"), ${FOLD_ACCENTED}, ${FOLD_PLAIN}) LIKE ${like}
        LIMIT ${CANDIDATE_LIMIT}
      `,
      prisma.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "lessons"
        WHERE "status" = 'PUBLISHED'
          AND translate(lower("title" || ' ' || "description"), ${FOLD_ACCENTED}, ${FOLD_PLAIN}) LIKE ${like}
        LIMIT ${CANDIDATE_LIMIT}
      `,
      // A note is looked up by what is in it and by the lesson it hangs off:
      // "the note I took on injection" is how people remember their own notes.
      prisma.$queryRaw<{ id: string }[]>`
        SELECT n."id" FROM "notes" n
        JOIN "lessons" l ON l."id" = n."lessonId"
        WHERE n."userId" = ${userId}::uuid
          AND (
            translate(lower(n."content"), ${FOLD_ACCENTED}, ${FOLD_PLAIN}) LIKE ${like}
            OR translate(lower(l."title"), ${FOLD_ACCENTED}, ${FOLD_PLAIN}) LIKE ${like}
          )
        LIMIT ${CANDIDATE_LIMIT}
      `,
    ]);

    const ids = (rows: { id: string }[]): string[] => rows.map((r) => r.id);

    // Stage two: the visibility rules, unchanged and shared with the catalogue.
    const [paths, lessons, notes] = await Promise.all([
      pathIds.length === 0
        ? Promise.resolve([])
        : prisma.path.findMany({
            where: { id: { in: ids(pathIds) }, ...pathsVisibleTo(userId) },
            take,
            orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
            select: {
              id: true,
              slug: true,
              title: true,
              description: true,
              category: true,
              difficulty: true,
              estimatedHours: true,
              _count: { select: { lessons: true } },
            },
          }),
      lessonIds.length === 0
        ? Promise.resolve([])
        : prisma.lesson.findMany({
            where: { id: { in: ids(lessonIds) }, ...lessonsVisibleTo(userId) },
            take,
            orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
            select: {
              id: true,
              slug: true,
              title: true,
              description: true,
              category: true,
              difficulty: true,
              estimatedMinutes: true,
            },
          }),
      noteIds.length === 0
        ? Promise.resolve([])
        : prisma.note.findMany({
            // userId again: the pre-filter already scoped to the owner, and a
            // note is the one thing here nobody else may read, so it is worth
            // saying twice.
            where: { id: { in: ids(noteIds) }, userId },
            take,
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              content: true,
              wordCount: true,
              updatedAt: true,
              lesson: { select: { slug: true, title: true, category: true } },
            },
          }),
    ]);

    return {
      paths: paths.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        category: p.category,
        difficulty: p.difficulty,
        estimatedHours: p.estimatedHours,
        lessonCount: p._count.lessons,
      })),
      lessons,
      notes: notes.map((n) => ({
        id: n.id,
        content: n.content,
        wordCount: n.wordCount,
        updatedAt: n.updatedAt,
        lessonSlug: n.lesson.slug,
        lessonTitle: n.lesson.title,
        lessonCategory: n.lesson.category,
      })),
    };
  },
};
