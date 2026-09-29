import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  findMany: vi.fn(),
  groupBy: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => ({
  prisma: { lesson: { findMany: m.findMany, groupBy: m.groupBy } },
}));

const { lessonOrigin, listLessons } = await import("../lesson-list.service");

function row(refCode: string, status: string, audience = "CATALOGUE"): Record<string, unknown> {
  return {
    id: `id-${refCode}`,
    refCode,
    slug: refCode.toLowerCase(),
    title: refCode,
    category: "DEV",
    difficulty: "BEGINNER",
    status,
    audience,
    xpReward: 100,
    estimatedMinutes: 30,
    _count: { progress: 2, pathLessons: 1 },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  m.groupBy.mockResolvedValue([
    { status: "PUBLISHED", _count: { _all: 250 } },
    { status: "DRAFT", _count: { _all: 8 } },
    { status: "ARCHIVED", _count: { _all: 3 } },
  ]);
});

describe("lessonOrigin", () => {
  it("tells the first catalogue, the new one and a teacher's class lesson apart", () => {
    expect(lessonOrigin("CL-LSN-042-V01", "CATALOGUE")).toBe("first");
    expect(lessonOrigin("CL-LSN-01042-V01", "CATALOGUE")).toBe("new");
    expect(lessonOrigin("CL-CLS-ab12cd-V01", "CLASS")).toBe("class");
  });
});

describe("listLessons", () => {
  it("keeps the archives out of the working list", async () => {
    m.findMany.mockResolvedValue([row("CL-LSN-01001-V01", "PUBLISHED")]);
    await listLessons("active");
    expect(m.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { status: { in: ["DRAFT", "PUBLISHED"] } },
    });
  });

  it("lists only archived lessons in the archives", async () => {
    m.findMany.mockResolvedValue([row("CL-LSN-042-V01", "ARCHIVED")]);
    await listLessons("archives");
    expect(m.findMany.mock.calls[0]?.[0]).toMatchObject({ where: { status: "ARCHIVED" } });
  });

  it("gives each row its origin, and the counts of every folder", async () => {
    m.findMany.mockResolvedValue([
      row("CL-LSN-042-V01", "PUBLISHED"),
      row("CL-LSN-01001-V01", "DRAFT"),
      row("CL-CLS-ab12cd-V01", "PUBLISHED", "CLASS"),
    ]);

    const { rows, counts } = await listLessons("active");

    expect(rows.map((r) => r.origin)).toEqual(["first", "new", "class"]);
    expect(rows[0]).toMatchObject({ completions: 2, pathLessonsCount: 1 });
    expect(counts).toEqual({ published: 250, draft: 8, archived: 3 });
  });

  it("counts an empty folder as zero", async () => {
    m.findMany.mockResolvedValue([]);
    m.groupBy.mockResolvedValue([]);
    const { counts } = await listLessons("archives");
    expect(counts).toEqual({ published: 0, draft: 0, archived: 0 });
  });
});
