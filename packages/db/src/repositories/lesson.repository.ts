import { prisma } from "../prisma.js";
import type {
  Category,
  ContentAudience,
  ContentStatus,
  Difficulty,
  Prisma,
  ProgressStatus,
} from "@prisma/client";
import { isFirstCatalogueLesson } from "@cyberlearn/types";
import { AUDIT_ACTION } from "../audit-actions.js";
import { auditLogRepository } from "./audit-log.repository.js";
import { readSlice, type ConsolePage, type ConsoleSlice, type SortDir } from "./console-page.js";
import { LESSON_CONTENT_SELECT, type LessonContent } from "./lesson-version.repository.js";
import { pathRepository } from "./path.repository.js";

/**
 * What the open catalogue is, in one place.
 *
 * Published was the whole rule while every lesson belonged to everyone. It
 * stopped being so the moment a teacher could write one for their own classes:
 * a CLASS lesson is published - a class has to be able to open it - and it is
 * not catalogue content. Anything that counts, ranks or recommends lessons to
 * the platform at large reads this, so a private lesson cannot turn up in a
 * path, in the placement recommendations, or in the figures on the dashboard.
 */
export const CATALOGUE_LESSON = {
  status: "PUBLISHED",
  audience: "CATALOGUE",
} as const satisfies Prisma.LessonWhereInput;

/**
 * What one person may open: the catalogue, plus the lessons written for the
 * classes they are in or teach.
 *
 * Scoped by the caller's own id rather than by a role, like every other class
 * read: Prisma connects as the table owner and bypasses RLS, so the policy on
 * public.lessons is a second line of defence over the Data API and this where
 * clause is the one doing the work.
 */
export function lessonsVisibleTo(userId: string): Prisma.LessonWhereInput {
  return {
    status: "PUBLISHED",
    OR: [
      { audience: "CATALOGUE" },
      {
        classLinks: {
          some: {
            class: {
              OR: [
                { members: { some: { userId } } },
                { teachers: { some: { teacherId: userId } } },
              ],
            },
          },
        },
      },
    ],
  };
}

/** What the catalogue can be narrowed by: the facets beside the list, and its search box. */
export interface CatalogueFilters {
  category?: Category | undefined;
  difficulty?: Difficulty | undefined;
  /** Filter by user's progress status. Requires userId to be meaningful. */
  progressStatus?: ProgressStatus | undefined;
  search?: string | undefined;
}

export interface LessonFilters extends CatalogueFilters {
  page?: number;
  pageSize?: number;
  /** Fetch the matching catalogue before applying user-specific availability ordering. */
  paginate?: boolean;
}

/**
 * The catalogue one reader sees, narrowed by the filters they chose.
 *
 * Each condition is its own term of an AND, never spread into one object: the
 * visibility rule and the search both say OR, and spread together the search's
 * OR replaced the audience one, so a search listed every class's own lessons.
 * The list and the counts beside it both read this, so they cannot disagree.
 */
export function catalogueWhere(
  userId: string,
  filters: CatalogueFilters = {},
): Prisma.LessonWhereInput {
  const { category, difficulty, progressStatus, search } = filters;
  const terms: Prisma.LessonWhereInput[] = [
    // Their class's own lessons sit in the catalogue beside the platform's,
    // for them alone. A separate list would mean a second place to look, a
    // second search box, and a lesson that is real work being filed as an
    // annexe.
    lessonsVisibleTo(userId),
  ];
  if (category !== undefined) terms.push({ category });
  if (difficulty !== undefined) terms.push({ difficulty });
  if (progressStatus === "COMPLETED" || progressStatus === "IN_PROGRESS") {
    terms.push({ progress: { some: { userId, status: progressStatus } } });
  } else if (progressStatus === "NOT_STARTED") {
    terms.push({ progress: { none: { userId } } });
  }
  if (search !== undefined && search.length > 0) {
    terms.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    });
  }
  return { AND: terms };
}

/**
 * A completed lesson's quiz score, as the catalogue shows it ("3/5"). Null
 * before completion, for a lesson without quizzes, and for one completed
 * before answers were recorded.
 */
function quizScoreOf(
  progress: { status: string; quizCorrect: number | null; quizTotal: number | null } | undefined,
): { correct: number; total: number } | null {
  if (progress?.status !== "COMPLETED") return null;
  if (progress.quizTotal === null || progress.quizTotal === 0 || progress.quizCorrect === null) {
    return null;
  }
  return { correct: progress.quizCorrect, total: progress.quizTotal };
}

/** The console's two lesson lists: the working one, and the archives. */
export type ConsoleLessonFolder = "active" | "archives";

/** Which catalogue a lesson comes from: a teacher's class, the first one (CL-LSN-NNN), the new one. */
export type ConsoleLessonOrigin = "new" | "first" | "class";

export type ConsoleLessonSort = "title" | "category" | "difficulty" | "xp" | "rating" | "status";

export interface ConsoleLessonQuery extends ConsolePage {
  folder: ConsoleLessonFolder;
  /** Part of a title, a refCode or a slug; empty for none. */
  q: string;
  category: Category | undefined;
  difficulty: Difficulty | undefined;
  /** The working list only: the archives hold one status. */
  status: "DRAFT" | "PUBLISHED" | undefined;
  origin: ConsoleLessonOrigin | undefined;
  /** None keeps the list's own order: drafts first, newest first. */
  sort: { key: ConsoleLessonSort; dir: SortDir } | undefined;
}

const CONSOLE_LESSON_ROW = {
  id: true,
  refCode: true,
  slug: true,
  title: true,
  category: true,
  difficulty: true,
  status: true,
  audience: true,
  xpReward: true,
  estimatedMinutes: true,
  avgRating: true,
  ratingsCount: true,
  _count: {
    select: {
      progress: { where: { status: "COMPLETED" } },
      pathLessons: true,
    },
  },
} as const satisfies Prisma.LessonSelect;

export type ConsoleLessonRow = Prisma.LessonGetPayload<{ select: typeof CONSOLE_LESSON_ROW }>;

/** What the console's quick search shows of a lesson. */
const CONSOLE_LESSON_HIT = {
  id: true,
  refCode: true,
  title: true,
  status: true,
  audience: true,
} as const satisfies Prisma.LessonSelect;

export type ConsoleLessonHit = Prisma.LessonGetPayload<{ select: typeof CONSOLE_LESSON_HIT }>;

/**
 * A lesson with the catalogue paths that hold it, for its page in the
 * console. A teacher's class path is not the console's to edit from there,
 * so it is not read.
 */
const LESSON_CATALOGUE_PATHS = {
  id: true,
  refCode: true,
  audience: true,
  pathLessons: {
    where: { path: { audience: "CATALOGUE" } },
    select: { pathId: true, path: { select: { refCode: true } } },
  },
} as const satisfies Prisma.LessonSelect;

export type LessonCataloguePaths = Prisma.LessonGetPayload<{
  select: typeof LESSON_CATALOGUE_PATHS;
}>;

/** A lesson with the refCodes of the lessons it requires, for its page in the console. */
const LESSON_PREREQUISITES = {
  id: true,
  refCode: true,
  audience: true,
  prerequisites: { select: { prerequisite: { select: { refCode: true } } } },
} as const satisfies Prisma.LessonSelect;

export type LessonPrerequisites = Prisma.LessonGetPayload<{
  select: typeof LESSON_PREREQUISITES;
}>;

/**
 * A lesson as its studio opens on it: the content it publishes, its state
 * and rating, the paths that hold it with the place in each, and what it
 * requires.
 */
const LESSON_STUDIO = {
  ...LESSON_CONTENT_SELECT,
  id: true,
  status: true,
  audience: true,
  version: true,
  avgRating: true,
  ratingsCount: true,
  pathLessons: {
    select: {
      position: true,
      module: { select: { title: true } },
      path: {
        select: { id: true, refCode: true, title: true, status: true, audience: true },
      },
    },
  },
  prerequisites: { select: { prerequisiteId: true } },
} as const satisfies Prisma.LessonSelect;

export type LessonStudioView = Prisma.LessonGetPayload<{ select: typeof LESSON_STUDIO }>;

/** A lesson the console offers as a prerequisite. */
export interface LessonOption {
  id: string;
  refCode: string;
  title: string;
}

/** A lesson and its refCode, as the console's audit rows name it. */
export interface LessonRef {
  id: string;
  refCode: string;
}

/** What the console checks before it deletes a lesson. */
export interface LessonDeletionCheck {
  id: string;
  title: string;
  status: ContentStatus;
  /** How many paths, catalogue or class, hold it. */
  pathCount: number;
}

/** A lesson the console's form creates. */
export interface ConsoleLessonCreate {
  /** Everything the lesson holds, the slug and the cover included. */
  fields: LessonContent;
  /** PUBLISHED, stamped now, rather than DRAFT. */
  publish: boolean;
  /** The administrator creating it: its author, and the actor of its audit row. */
  actorId: string;
  /** The catalogue paths it joins, in the order chosen: each takes it at its end. */
  paths: readonly LessonRef[];
  /** The lessons it requires, every one already checked to be a catalogue lesson. */
  prerequisiteIds: readonly string[];
}

/** A lesson moved in and out of catalogue paths from its page in the console. */
export interface ConsoleLessonPathsChange {
  lesson: LessonRef;
  /** The paths it joins, in the order chosen: each takes it at its end. */
  added: readonly LessonRef[];
  /** The paths it leaves: each closes the gap. */
  removed: readonly LessonRef[];
  actorId: string;
}

/** A lesson's prerequisites replaced from its page in the console. */
export interface ConsoleLessonPrerequisitesChange {
  lesson: LessonRef;
  /** The refCodes it requires today, for the audit row. */
  before: readonly string[];
  /** What it requires from now on, in the order chosen. */
  prerequisites: readonly LessonRef[];
  actorId: string;
  /**
   * The loop these prerequisites would close, as a chain of lesson ids, or
   * null. Given the catalogue's links as the transaction reads them, before
   * anything is written.
   */
  findCycle: (edges: { lessonId: string; prerequisiteId: string }[]) => string[] | null;
}

/** A console search over a lesson's title, refCode or slug. */
function consoleLessonTextWhere(q: string): Prisma.LessonWhereInput {
  return {
    OR: [
      { title: { contains: q, mode: "insensitive" } },
      { refCode: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ],
  };
}

function folderWhere(folder: ConsoleLessonFolder): Prisma.LessonWhereInput {
  return folder === "archives"
    ? { status: "ARCHIVED" }
    : { status: { in: ["DRAFT", "PUBLISHED"] } };
}

/**
 * The first catalogue is told apart by the shape of its refCode, which a
 * Prisma filter cannot express. Its lessons are read once, ids and codes only,
 * and only when the origin filter asks for them.
 */
async function firstCatalogueIds(folder: ConsoleLessonFolder): Promise<string[]> {
  const catalogue = await prisma.lesson.findMany({
    where: { AND: [folderWhere(folder), { audience: "CATALOGUE" }] },
    select: { id: true, refCode: true },
  });
  return catalogue.filter((row) => isFirstCatalogueLesson(row.refCode)).map((row) => row.id);
}

/**
 * The lessons a console filter matches. Each filter is its own term of an AND,
 * as in catalogueWhere: the search says OR, and spread into one object with
 * another OR one of them would be lost.
 */
async function consoleLessonWhere(query: ConsoleLessonQuery): Promise<Prisma.LessonWhereInput> {
  const terms: Prisma.LessonWhereInput[] = [folderWhere(query.folder)];
  if (query.folder === "active" && query.status !== undefined) terms.push({ status: query.status });
  if (query.category !== undefined) terms.push({ category: query.category });
  if (query.difficulty !== undefined) terms.push({ difficulty: query.difficulty });
  const q = query.q.trim();
  if (q !== "") terms.push(consoleLessonTextWhere(q));
  if (query.origin === "class") {
    terms.push({ audience: "CLASS" });
  } else if (query.origin !== undefined) {
    const first = await firstCatalogueIds(query.folder);
    terms.push(
      query.origin === "first"
        ? { id: { in: first } }
        : { audience: "CATALOGUE", id: { notIn: first } },
    );
  }
  return { AND: terms };
}

function consoleLessonOrder(
  sort: ConsoleLessonQuery["sort"],
): Prisma.LessonOrderByWithRelationInput[] {
  // The id last: rows that tie would otherwise trade places between pages.
  const tieBreak: Prisma.LessonOrderByWithRelationInput = { id: "asc" };
  if (sort === undefined) return [{ status: "asc" }, { createdAt: "desc" }, tieBreak];
  switch (sort.key) {
    case "title":
      return [{ title: sort.dir }, tieBreak];
    case "category":
      return [{ category: sort.dir }, { title: "asc" }, tieBreak];
    case "difficulty":
      return [{ difficulty: sort.dir }, { title: "asc" }, tieBreak];
    case "xp":
      return [{ xpReward: sort.dir }, { title: "asc" }, tieBreak];
    case "rating":
      // A lesson nobody rated has no average: it goes last whichever way the
      // column sorts, rather than reading as the worst or the best. Between
      // two equal averages, the one more people gave comes first.
      return [
        { avgRating: { sort: sort.dir, nulls: "last" } },
        { ratingsCount: "desc" },
        { title: "asc" },
        tieBreak,
      ];
    case "status":
      return [{ status: sort.dir }, { createdAt: "desc" }, tieBreak];
  }
}

/** See lessonRepository.findWaivedLessonIds. */
async function waivedLessonIdsFor(userId: string, lessonIds?: string[]): Promise<string[]> {
  if (lessonIds?.length === 0) return [];
  const rows = await prisma.userSkipWaiver.findMany({
    where: { userId, ...(lessonIds !== undefined ? { lessonId: { in: lessonIds } } : {}) },
    select: { lessonId: true },
  });
  return rows.map((row) => row.lessonId);
}

export const lessonRepository = {
  /**
   * One page of one of the console's lesson lists, under its filters. The
   * completions are counted in the same read; no column sorts by them, since
   * the database can only order by every progress row, finished or not.
   */
  async listForConsole(query: ConsoleLessonQuery): Promise<ConsoleSlice<ConsoleLessonRow>> {
    const where = await consoleLessonWhere(query);
    return readSlice(
      query,
      () => prisma.lesson.count({ where }),
      ({ skip, take }) =>
        prisma.lesson.findMany({
          where,
          orderBy: consoleLessonOrder(query.sort),
          skip,
          take,
          select: CONSOLE_LESSON_ROW,
        }),
    );
  },

  /**
   * The few lessons the console's quick search offers for a term, whatever
   * their status: a lesson somebody is looking for by name is as likely to be
   * a draft or in the archives as on the site, and the result says which.
   * Drafts first, the archives last, then by title. An empty term matches
   * nothing.
   */
  async searchForConsole(q: string, take: number): Promise<ConsoleLessonHit[]> {
    const term = q.trim();
    if (term === "") return [];
    return prisma.lesson.findMany({
      where: consoleLessonTextWhere(term),
      orderBy: [{ status: "asc" }, { title: "asc" }, { id: "asc" }],
      take,
      select: CONSOLE_LESSON_HIT,
    });
  },

  /** How many lessons each status holds, every audience included. */
  async countByStatus(): Promise<Record<ContentStatus, number>> {
    const grouped = await prisma.lesson.groupBy({ by: ["status"], _count: { _all: true } });
    const count = (status: ContentStatus): number =>
      grouped.find((g) => g.status === status)?._count._all ?? 0;
    return { DRAFT: count("DRAFT"), PUBLISHED: count("PUBLISHED"), ARCHIVED: count("ARCHIVED") };
  },

  /** The id of a published lesson this reader may open, by slug; null otherwise. */
  async findIdBySlug(slug: string, viewerId: string): Promise<string | null> {
    const lesson = await prisma.lesson.findFirst({
      where: { slug, ...lessonsVisibleTo(viewerId) },
      select: { id: true },
    });
    return lesson?.id ?? null;
  },

  /**
   * The title and the text of lessons, for a module's revision sheet. Published
   * ones only: the sheet is handed to learners, and a draft's or an archived
   * lesson's "à retenir" is not theirs to read.
   */
  async findRecapSources(ids: readonly string[]) {
    if (ids.length === 0) return [];
    return prisma.lesson.findMany({
      where: { id: { in: [...ids] }, status: "PUBLISHED" },
      select: { id: true, title: true, contentMdx: true },
    });
  },

  /**
   * A published lesson this reader may open, by slug.
   *
   * The reader is not decoration: a CLASS lesson is published, so "published"
   * alone would hand it to anyone who guessed the slug.
   */
  async findBySlug(slug: string, viewerId: string) {
    return prisma.lesson.findFirst({
      where: { slug, ...lessonsVisibleTo(viewerId) },
      select: {
        id: true,
        refCode: true,
        slug: true,
        title: true,
        description: true,
        category: true,
        difficulty: true,
        estimatedMinutes: true,
        xpReward: true,
        contentMdx: true,
        coverImageUrl: true,
        publishedAt: true,
      },
    });
  },

  /**
   * A published lesson this reader may open, by id, with what a completion or
   * a quiz answer reads off it. Null for a draft, an archived lesson, or a
   * class's own lesson the reader is not in the class of: none of them may be
   * completed or answered, whatever id the caller sends.
   */
  async findReadableById(lessonId: string, viewerId: string) {
    return prisma.lesson.findFirst({
      where: { id: lessonId, ...lessonsVisibleTo(viewerId) },
      select: {
        id: true,
        slug: true,
        title: true,
        xpReward: true,
        audience: true,
        category: true,
        contentMdx: true,
      },
    });
  },

  /**
   * A lesson by slug whatever its status or audience: a draft, an archived
   * one, a class's own. For an administrator reviewing the catalogue before
   * it is published; the caller checks the role, this only reads.
   */
  async findBySlugForReview(slug: string) {
    return prisma.lesson.findUnique({
      where: { slug },
      select: {
        id: true,
        refCode: true,
        slug: true,
        title: true,
        description: true,
        category: true,
        difficulty: true,
        estimatedMinutes: true,
        xpReward: true,
        contentMdx: true,
        coverImageUrl: true,
        publishedAt: true,
        status: true,
      },
    });
  },

  /** List published lessons with the user's progress joined. Used for the catalog page. */
  async findManyWithProgress(userId: string, filters: LessonFilters = {}) {
    const { page = 1, pageSize = 9 } = filters;
    const where = catalogueWhere(userId, filters);

    const [total, rows] = await Promise.all([
      prisma.lesson.count({ where }),
      prisma.lesson.findMany({
        where,
        ...(filters.paginate === false ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
        orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
        select: {
          id: true,
          refCode: true,
          slug: true,
          title: true,
          description: true,
          category: true,
          difficulty: true,
          estimatedMinutes: true,
          xpReward: true,
          coverImageUrl: true,
          progress: {
            where: { userId },
            select: { status: true, completedAt: true, quizCorrect: true, quizTotal: true },
          },
        },
      }),
    ]);

    return {
      total,
      lessons: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        category: row.category,
        difficulty: row.difficulty,
        estimatedMinutes: row.estimatedMinutes,
        xpReward: row.xpReward,
        coverImageUrl: row.coverImageUrl,
        refCode: row.refCode,
        progressStatus: row.progress[0]?.status ?? null,
        quizScore: quizScoreOf(row.progress[0]),
      })),
    };
  },

  /**
   * Lessons per category, for the filter badges.
   *
   * Counted for the reader, because the list is: a badge saying 40 over a list
   * of 41 is the kind of wrongness nobody reports and everybody notices. And
   * under the reader's other filters, for the same reason: each badge says
   * how many lessons a click on it would list. The category itself is left
   * out, or every badge but the chosen one would read 0.
   */
  async countByCategory(viewerId: string, filters: Omit<CatalogueFilters, "category"> = {}) {
    const rows = await prisma.lesson.groupBy({
      by: ["category"],
      // Dropped at run time too: the type keeps a literal out, not an object
      // that happens to carry one.
      where: catalogueWhere(viewerId, { ...filters, category: undefined }),
      _count: { id: true },
    });
    return Object.fromEntries(rows.map((r) => [r.category, r._count.id]));
  },

  async findProgress(userId: string, lessonId: string) {
    return prisma.userLessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { status: true, attempts: true, completedAt: true, timeSpentSeconds: true },
    });
  },

  /**
   * The lessons the placement test waived for the reader, among `lessonIds`
   * when given. A waiver opens a lesson and what follows it in its path, as a
   * completion would, without marking it completed or awarding anything.
   */
  findWaivedLessonIds: waivedLessonIdsFor,

  /**
   * The published paths these lessons belong to, each with its full ordered
   * lesson list, plus which of those lessons the reader has completed and
   * which the placement test waived.
   *
   * Whole paths rather than just the lessons asked about: the sequential rule
   * needs each lesson's neighbours, and a catalogue page asks about nine
   * lessons scattered across as many paths. Four queries whatever the page
   * size, instead of one per card.
   */
  async findPathContexts(userId: string, lessonIds: string[]) {
    if (lessonIds.length === 0) return { paths: [], completedLessonIds: [], waivedLessonIds: [] };

    const links = await prisma.pathLesson.findMany({
      where: { lessonId: { in: lessonIds }, path: { status: "PUBLISHED" } },
      select: { pathId: true },
    });
    if (links.length === 0) return { paths: [], completedLessonIds: [], waivedLessonIds: [] };

    const paths = await prisma.path.findMany({
      where: { id: { in: [...new Set(links.map((l) => l.pathId))] } },
      select: {
        id: true,
        slug: true,
        title: true,
        lessons: {
          // Order matters: the rule reads adjacency off this array.
          orderBy: { position: "asc" },
          where: { lesson: { status: "PUBLISHED" } },
          select: {
            position: true,
            lesson: {
              select: {
                id: true,
                slug: true,
                title: true,
                difficulty: true,
                category: true,
                xpReward: true,
                estimatedMinutes: true,
              },
            },
          },
        },
      },
    });

    const pathLessonIds = paths.flatMap((p) => p.lessons.map((pl) => pl.lesson.id));
    const [completed, waivedLessonIds] = await Promise.all([
      prisma.userLessonProgress.findMany({
        where: { userId, status: "COMPLETED", lessonId: { in: pathLessonIds } },
        select: { lessonId: true },
      }),
      waivedLessonIdsFor(userId, pathLessonIds),
    ]);

    return { paths, completedLessonIds: completed.map((c) => c.lessonId), waivedLessonIds };
  },

  /**
   * A lesson as the console's page of its ratings heads it: its title, and
   * the average and count kept on the row over every rating.
   */
  async findRatingTotals(lessonId: string) {
    return prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, title: true, avgRating: true, ratingsCount: true },
    });
  },

  /**
   * Who wrote a lesson, for the byline in the rail.
   *
   * The author is null once that account is erased: the lesson survives them,
   * the credit does not. It is never null for a lesson that simply has no
   * author, since every path that writes one sets it.
   */
  async findAuthor(lessonId: string) {
    return prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        publishedAt: true,
        createdAt: true,
        // The byline reads this: a lesson with no author is the platform's own
        // work on one side and an erased account on the other.
        audience: true,
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            role: true,
            preferences: { select: { publicProfile: true } },
          },
        },
      },
    });
  },

  async upsertProgress(data: {
    userId: string;
    lessonId: string;
    status: ProgressStatus;
    attempts?: number;
    completedAt?: Date;
  }) {
    return prisma.userLessonProgress.upsert({
      where: { userId_lessonId: { userId: data.userId, lessonId: data.lessonId } },
      create: {
        userId: data.userId,
        lessonId: data.lessonId,
        status: data.status,
        attempts: data.attempts ?? 1,
        ...(data.completedAt !== undefined ? { completedAt: data.completedAt } : {}),
      },
      update: {
        status: data.status,
        ...(data.completedAt !== undefined ? { completedAt: data.completedAt } : {}),
        ...(data.attempts !== undefined ? { attempts: data.attempts } : {}),
      },
    });
  },

  /**
   * Every prerequisite link of the catalogue, for the console's cycle check
   * before a lesson's prerequisites change. A few rows per lesson: the whole
   * graph is read once rather than walked query by query.
   */
  async findPrerequisiteEdges(
    db: Prisma.TransactionClient = prisma,
  ): Promise<{ lessonId: string; prerequisiteId: string }[]> {
    return db.lessonPrerequisite.findMany({ select: { lessonId: true, prerequisiteId: true } });
  },

  /**
   * Gives a lesson exactly these prerequisites. Runs in the caller's
   * transaction, which also checked them and writes the audit line.
   */
  async replacePrerequisites(
    lessonId: string,
    prerequisiteIds: readonly string[],
    db: Prisma.TransactionClient = prisma,
  ): Promise<void> {
    await db.lessonPrerequisite.deleteMany({ where: { lessonId } });
    if (prerequisiteIds.length === 0) return;
    await db.lessonPrerequisite.createMany({
      data: prerequisiteIds.map((prerequisiteId) => ({ lessonId, prerequisiteId })),
      skipDuplicates: true,
    });
  },

  // ── Console ─────────────────────────────────────────────────────────────────
  //
  // What the console's lesson pages read and write. Every write lands with its
  // audit row, in the same transaction when the console wrote one before.

  /**
   * Every refCode of the CL-LSN- series, whatever the lesson's audience or
   * status: the code the console proposes has to be free of all of them.
   */
  async findLessonRefCodes(): Promise<string[]> {
    const rows = await prisma.lesson.findMany({
      where: { refCode: { startsWith: "CL-LSN-" } },
      select: { refCode: true },
    });
    return rows.map((row) => row.refCode);
  },

  /** The catalogue lessons among these ids: the only ones a catalogue lesson may require. */
  async findCatalogueIds(ids: readonly string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await prisma.lesson.findMany({
      where: { id: { in: [...ids] }, audience: "CATALOGUE" },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  },

  /** The lessons among these ids, with their audience, chosen as prerequisites. */
  async findPrerequisiteChoices(
    ids: readonly string[],
  ): Promise<{ id: string; refCode: string; audience: ContentAudience }[]> {
    if (ids.length === 0) return [];
    return prisma.lesson.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, refCode: true, audience: true },
    });
  },

  /** Which of this refCode and this slug a lesson other than `lessonId` already holds. */
  async findTaken(
    fields: { refCode: string; slug: string },
    lessonId: string,
  ): Promise<{ refCode: boolean; slug: boolean }> {
    const [refCodeOwner, slugOwner] = await Promise.all([
      prisma.lesson.findFirst({
        where: { refCode: fields.refCode, NOT: { id: lessonId } },
        select: { id: true },
      }),
      prisma.lesson.findFirst({
        where: { slug: fields.slug, NOT: { id: lessonId } },
        select: { id: true },
      }),
    ]);
    return { refCode: refCodeOwner !== null, slug: slugOwner !== null };
  },

  /** The lesson as its studio opens on it; null when it does not exist. */
  async findForStudio(lessonId: string): Promise<LessonStudioView | null> {
    return prisma.lesson.findUnique({ where: { id: lessonId }, select: LESSON_STUDIO });
  },

  /**
   * The lessons the console offers a lesson to require, by refCode: the
   * catalogue's, archives left aside, without the lesson itself (`except`),
   * and those already required kept even if archived since (`keep`).
   */
  async findPrerequisiteOptions(
    options: { except?: string; keep?: readonly string[] } = {},
  ): Promise<LessonOption[]> {
    return prisma.lesson.findMany({
      where: {
        ...(options.except !== undefined && { NOT: { id: options.except } }),
        OR: [
          { audience: "CATALOGUE", status: { not: "ARCHIVED" } },
          { id: { in: [...(options.keep ?? [])] } },
        ],
      },
      orderBy: { refCode: "asc" },
      select: { id: true, refCode: true, title: true },
    });
  },

  async findCataloguePaths(lessonId: string): Promise<LessonCataloguePaths | null> {
    return prisma.lesson.findUnique({ where: { id: lessonId }, select: LESSON_CATALOGUE_PATHS });
  },

  async findPrerequisites(lessonId: string): Promise<LessonPrerequisites | null> {
    return prisma.lesson.findUnique({ where: { id: lessonId }, select: LESSON_PREREQUISITES });
  },

  async findStatus(lessonId: string): Promise<{ id: string; status: ContentStatus } | null> {
    return prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, status: true },
    });
  },

  async findForDeletion(lessonId: string): Promise<LessonDeletionCheck | null> {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, title: true, status: true, _count: { select: { pathLessons: true } } },
    });
    if (!lesson) return null;
    return {
      id: lesson.id,
      title: lesson.title,
      status: lesson.status,
      pathCount: lesson._count.pathLessons,
    };
  },

  /**
   * Creates a lesson from the console's form, with its paths, its
   * prerequisites and its `lesson.create` row, in one transaction. A refCode
   * or a slug already taken throws the unique violation, and nothing is
   * written.
   */
  async createFromConsole(create: ConsoleLessonCreate): Promise<string> {
    return prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.create({
        data: {
          ...create.fields,
          authorId: create.actorId,
          status: create.publish ? "PUBLISHED" : "DRAFT",
          publishedAt: create.publish ? new Date() : null,
        },
      });

      // In the order chosen: each path takes the lesson at its end.
      for (const path of create.paths) await pathRepository.attachLesson(path.id, lesson.id, tx);
      await this.replacePrerequisites(lesson.id, create.prerequisiteIds, tx);

      await auditLogRepository.record(
        {
          actorId: create.actorId,
          action: AUDIT_ACTION.lesson.create,
          targetType: "Lesson",
          targetId: lesson.id,
          metadata: {
            title: lesson.title,
            status: lesson.status,
            paths: create.paths.map((path) => path.refCode),
            prerequisites: create.prerequisiteIds.length,
          },
        },
        tx,
      );
      return lesson.id;
    });
  },

  /**
   * Sets one lesson's status, publishedAt stamped on a publish, with its
   * `lesson.status` row in the same transaction.
   */
  async changeStatus(change: {
    lessonId: string;
    from: ContentStatus;
    to: ContentStatus;
    actorId: string;
  }): Promise<void> {
    const data: { status: ContentStatus; publishedAt?: Date } = { status: change.to };
    if (change.to === "PUBLISHED") data.publishedAt = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.lesson.update({ where: { id: change.lessonId }, data });
      await auditLogRepository.record(
        {
          actorId: change.actorId,
          action: AUDIT_ACTION.lesson.status,
          targetType: "Lesson",
          targetId: change.lessonId,
          metadata: { from: change.from, to: change.to },
        },
        tx,
      );
    });
  },

  /**
   * One status for many lessons, from the list's selection, with one
   * `lesson.status.bulk` row naming the first of them and how many were
   * asked. Returns how many rows changed.
   */
  async changeStatuses(change: {
    lessonIds: readonly string[];
    to: ContentStatus;
    actorId: string;
  }): Promise<number> {
    const data: { status: ContentStatus; publishedAt?: Date } = { status: change.to };
    if (change.to === "PUBLISHED") data.publishedAt = new Date();
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.lesson.updateMany({
        where: { id: { in: [...change.lessonIds] } },
        data,
      });
      await auditLogRepository.record(
        {
          actorId: change.actorId,
          action: AUDIT_ACTION.lesson.statusBulk,
          targetType: "Lesson",
          targetId: change.lessonIds[0] ?? null,
          metadata: { to: change.to, count: change.lessonIds.length },
        },
        tx,
      );
      return count;
    });
  },

  /**
   * Deletes a lesson. What hangs off it goes with it; the console refuses a
   * published lesson, or one a path holds, before it gets here.
   */
  async delete(lessonId: string): Promise<void> {
    await prisma.lesson.delete({ where: { id: lessonId } });
  },

  /**
   * Moves a lesson in and out of catalogue paths, with its `lesson.paths`
   * row, in one transaction: the paths it leaves close the gap, those it
   * joins take it at their end (pathRepository.detachLesson, attachLesson).
   */
  async changePaths(change: ConsoleLessonPathsChange): Promise<void> {
    await prisma.$transaction(async (tx) => {
      for (const path of change.removed) {
        await pathRepository.detachLesson(path.id, change.lesson.id, tx);
      }
      for (const path of change.added) {
        await pathRepository.attachLesson(path.id, change.lesson.id, tx);
      }
      await auditLogRepository.record(
        {
          actorId: change.actorId,
          action: AUDIT_ACTION.lesson.paths,
          targetType: "Lesson",
          targetId: change.lesson.id,
          metadata: {
            refCode: change.lesson.refCode,
            added: change.added.map((path) => path.refCode),
            removed: change.removed.map((path) => path.refCode),
          },
        },
        tx,
      );
    });
  },

  /**
   * Gives a lesson exactly these prerequisites, with its
   * `lesson.prerequisites` row (refCodes before and after, sorted), unless
   * they would close a loop: the check reads the links inside the transaction
   * that replaces them, and a loop is returned with nothing written. Null once
   * they are saved.
   */
  async changePrerequisites(change: ConsoleLessonPrerequisitesChange): Promise<string[] | null> {
    const ids = change.prerequisites.map((lesson) => lesson.id);
    return prisma.$transaction(async (tx) => {
      const cycle = change.findCycle(await this.findPrerequisiteEdges(tx));
      if (cycle) return cycle;
      await this.replacePrerequisites(change.lesson.id, ids, tx);
      await auditLogRepository.record(
        {
          actorId: change.actorId,
          action: AUDIT_ACTION.lesson.prerequisites,
          targetType: "Lesson",
          targetId: change.lesson.id,
          metadata: {
            refCode: change.lesson.refCode,
            before: [...change.before].sort(),
            after: change.prerequisites.map((lesson) => lesson.refCode).sort(),
          },
        },
        tx,
      );
      return null;
    });
  },
};
