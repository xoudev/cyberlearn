import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  pathFindMany: vi.fn(),
  lessonFindMany: vi.fn(),
  pathUpdateMany: vi.fn(),
  lessonUpdateMany: vi.fn(),
  auditRecord: vi.fn(),
  transaction: vi.fn(),
}));

/** The transaction's client: the archive and its audit row are written through it. */
const tx = {
  path: { updateMany: m.pathUpdateMany },
  lesson: { updateMany: m.lessonUpdateMany },
};

vi.mock("@cyberlearn/db", () => ({
  prisma: {
    path: { findMany: m.pathFindMany },
    lesson: { findMany: m.lessonFindMany },
    $transaction: m.transaction,
  },
  auditLogRepository: { record: m.auditRecord },
}));

const { archiveFirstCatalogue, firstCatalogueCounts } = await import("../first-catalogue.service");

beforeEach(() => {
  vi.clearAllMocks();
  m.pathFindMany.mockResolvedValue([
    { id: "p-old", refCode: "CL-PATH-005-V01" },
    { id: "p-new", refCode: "CL-PATH-101-V01" },
  ]);
  m.lessonFindMany.mockResolvedValue([
    { id: "l-old-1", refCode: "CL-LSN-049-V01" },
    { id: "l-old-2", refCode: "CL-LSN-050-V01" },
    { id: "l-new", refCode: "CL-LSN-01001-V01" },
  ]);
  m.pathUpdateMany.mockResolvedValue({ count: 1 });
  m.lessonUpdateMany.mockResolvedValue({ count: 2 });
  m.auditRecord.mockResolvedValue(undefined);
  m.transaction.mockImplementation((fn: (client: typeof tx) => Promise<unknown>) => fn(tx));
});

describe("firstCatalogueCounts", () => {
  it("counts only the first catalogue, among catalogue content not yet archived", async () => {
    expect(await firstCatalogueCounts()).toEqual({ paths: 1, lessons: 2 });
    expect(m.pathFindMany.mock.calls[0]?.[0]).toMatchObject({
      where: { audience: "CATALOGUE", status: { not: "ARCHIVED" } },
    });
    expect(m.lessonFindMany.mock.calls[0]?.[0]).toMatchObject({
      where: { audience: "CATALOGUE", status: { not: "ARCHIVED" } },
    });
  });
});

describe("archiveFirstCatalogue", () => {
  it("archives the first catalogue's paths and lessons, and nothing of the new one", async () => {
    const result = await archiveFirstCatalogue("admin-1");

    expect(result).toEqual({ paths: 1, lessons: 2 });
    expect(m.pathUpdateMany.mock.calls[0]?.[0]).toMatchObject({
      where: { id: { in: ["p-old"] } },
      data: { status: "ARCHIVED" },
    });
    expect(m.lessonUpdateMany.mock.calls[0]?.[0]).toMatchObject({
      where: { id: { in: ["l-old-1", "l-old-2"] } },
      data: { status: "ARCHIVED" },
    });
    // In the archive's transaction, so the row lands with it or not at all.
    expect(m.auditRecord).toHaveBeenCalledExactlyOnceWith(
      {
        actorId: "admin-1",
        action: "catalogue.first.archive",
        targetType: "catalogue",
        targetId: null,
        metadata: { paths: 1, lessons: 2 },
      },
      tx,
    );
  });

  it("writes nothing once everything is archived", async () => {
    m.pathFindMany.mockResolvedValue([]);
    m.lessonFindMany.mockResolvedValue([{ id: "l-new", refCode: "CL-LSN-01001-V01" }]);

    expect(await archiveFirstCatalogue("admin-1")).toEqual({ paths: 0, lessons: 0 });
    expect(m.pathUpdateMany).not.toHaveBeenCalled();
    expect(m.transaction).not.toHaveBeenCalled();
    expect(m.auditRecord).not.toHaveBeenCalled();
  });
});
