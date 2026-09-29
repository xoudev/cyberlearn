import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  findMany: vi.fn(),
  groupBy: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => ({
  prisma: { path: { findMany: m.findMany, groupBy: m.groupBy } },
}));

const { listPaths, pathOrigin } = await import("../path-list.service");

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
    avgRating: null,
    ratingsCount: 0,
    _count: { lessons: 12, progress: 3, certificates: 1 },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  m.groupBy.mockResolvedValue([
    { status: "PUBLISHED", _count: { _all: 18 } },
    { status: "ARCHIVED", _count: { _all: 2 } },
  ]);
});

describe("pathOrigin", () => {
  it("tells the first catalogue, the new one and a class path apart", () => {
    expect(pathOrigin("CL-PATH-007-V01", "CATALOGUE")).toBe("first");
    expect(pathOrigin("CL-PATH-101-V01", "CATALOGUE")).toBe("new");
    expect(pathOrigin("CL-CPATH-ab12cd-V01", "CLASS")).toBe("class");
  });
});

describe("listPaths", () => {
  it("keeps the archives out of the working list", async () => {
    m.findMany.mockResolvedValue([]);
    await listPaths("active");
    expect(m.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { status: { in: ["DRAFT", "PUBLISHED"] } },
    });
  });

  it("lists only archived paths in the archives, with their counts", async () => {
    m.findMany.mockResolvedValue([row("CL-PATH-005-V01", "ARCHIVED")]);

    const { rows, counts } = await listPaths("archives");

    expect(m.findMany.mock.calls[0]?.[0]).toMatchObject({ where: { status: "ARCHIVED" } });
    expect(rows[0]).toMatchObject({ origin: "first", lessons: 12, completions: 3 });
    expect(counts).toEqual({ published: 18, draft: 0, archived: 2 });
  });
});
