import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SerializedPath } from "../_components/paths-collection";

/**
 * The catalogue page: which lesson a path in progress picks up at. It is the
 * path page's rule, so the placement test's waivers count: a waived lesson is
 * open but was never done, and "Continuer" passes over it on the path page.
 * The data and the session are stubbed; the collection is only handed props.
 */

const USER = "11111111-1111-4111-8111-111111111111";

const db = vi.hoisted(() => ({
  PUBLISHED_PATH_LESSON: {},
  pathsVisibleTo: vi.fn(() => ({})),
  prisma: {
    path: { findMany: vi.fn() },
    userPathProgress: { findMany: vi.fn() },
    userLessonProgress: { groupBy: vi.fn() },
  },
  lessonRepository: {
    findWaivedLessonIds: vi.fn<(userId: string, lessonIds?: string[]) => Promise<string[]>>(),
  },
}));
vi.mock("@cyberlearn/db", () => db);

vi.mock("@/lib/auth", () => ({ requireRequestUser: () => Promise.resolve({ id: USER }) }));
vi.mock("@/lib/paths/suggestions", () => ({
  savedLearningAnswers: () => Promise.resolve({}),
  toSuggestedPath: (p: unknown) => p,
}));
vi.mock("@/lib/paths/cover", () => ({
  resolvePathCovers: (paths: unknown[]) => Promise.resolve(paths.map(() => null)),
}));

const collection = vi.hoisted(() => ({
  PathsCollection: vi.fn<(props: { paths: SerializedPath[] }) => null>(() => null),
}));
vi.mock("../_components/paths-collection", () => collection);

const { default: PathsPage } = await import("../page");

function lesson(n: number) {
  const id = `l${String(n)}`;
  return {
    lessonId: id,
    position: n,
    lesson: {
      id,
      slug: `lecon-${String(n)}`,
      title: `Leçon ${String(n)}`,
      estimatedMinutes: 10,
      xpReward: 50,
    },
  };
}

const PATH = {
  id: "p1",
  slug: "python",
  refCode: "CL-PTH-001",
  title: "Python",
  description: "Les bases du langage.",
  category: "DEV",
  track: "SKILL",
  difficulty: "BEGINNER",
  estimatedHours: 8,
  audience: "CATALOGUE",
  certificateTemplate: null,
  avgRating: null,
  ratingsCount: 0,
  quiz: { isActive: true },
  lessons: [1, 2, 3, 4, 5, 6, 7, 8].map(lesson),
};

/** The one path, as the catalogue hands it to the collection. */
async function servedPath(): Promise<SerializedPath | undefined> {
  renderToStaticMarkup(await PathsPage());
  return collection.PathsCollection.mock.calls[0]?.[0].paths[0];
}

function completed(...ns: number[]): { lessonId: string }[] {
  return ns.map((n) => ({ lessonId: `l${String(n)}` }));
}

beforeEach(() => {
  vi.clearAllMocks();
  db.prisma.path.findMany.mockResolvedValue([PATH]);
  db.prisma.userPathProgress.findMany.mockResolvedValue([
    { pathId: "p1", status: "IN_PROGRESS", certificate: null },
  ]);
  db.prisma.userLessonProgress.groupBy.mockResolvedValue([]);
  db.lessonRepository.findWaivedLessonIds.mockResolvedValue([]);
});

describe("the paths catalogue page", () => {
  it("picks a path up at its first lesson not completed", async () => {
    db.prisma.userLessonProgress.groupBy.mockResolvedValue(completed(1, 2));
    expect((await servedPath())?.nextLesson).toMatchObject({ n: "03", slug: "lecon-3" });
  });

  it("passes over the lessons the placement test waived, as the path page does", async () => {
    db.prisma.userLessonProgress.groupBy.mockResolvedValue(completed(1));
    db.lessonRepository.findWaivedLessonIds.mockResolvedValue(["l2", "l3", "l4", "l5"]);
    expect((await servedPath())?.nextLesson).toMatchObject({
      n: "06",
      title: "Leçon 6",
      slug: "lecon-6",
    });
    // One read, for the lessons of the paths in progress.
    expect(db.lessonRepository.findWaivedLessonIds).toHaveBeenCalledTimes(1);
    expect(db.lessonRepository.findWaivedLessonIds).toHaveBeenCalledWith(
      USER,
      PATH.lessons.map((pl) => pl.lessonId),
    );
  });

  it("offers the first waived lesson when every lesson left was waived", async () => {
    db.prisma.userLessonProgress.groupBy.mockResolvedValue(completed(1, 2, 3, 4, 5));
    db.lessonRepository.findWaivedLessonIds.mockResolvedValue(["l6", "l7", "l8"]);
    expect((await servedPath())?.nextLesson).toMatchObject({ n: "06", slug: "lecon-6" });
  });

  it("has no next mission once every lesson is completed, which leads to the exam", async () => {
    db.prisma.userLessonProgress.groupBy.mockResolvedValue(completed(1, 2, 3, 4, 5, 6, 7, 8));
    db.lessonRepository.findWaivedLessonIds.mockResolvedValue(["l8"]);
    expect((await servedPath())?.nextLesson).toBeNull();
  });

  it("reads no waiver for a path that is not in progress", async () => {
    db.prisma.userPathProgress.findMany.mockResolvedValue([]);
    expect((await servedPath())?.nextLesson).toBeNull();
    expect(db.lessonRepository.findWaivedLessonIds).toHaveBeenCalledWith(USER, []);
  });
});
