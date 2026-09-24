import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  groupBy: vi.fn(),
  auditFindMany: vi.fn(),
  updateMany: vi.fn(),
  prereqDelete: vi.fn(),
  prereqCreate: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => {
  const tx = {
    lesson: { updateMany: m.updateMany },
    lessonPrerequisite: { deleteMany: m.prereqDelete, createMany: m.prereqCreate },
    auditLog: { create: m.auditCreate },
  };
  return {
    prisma: {
      lesson: { findMany: m.findMany, findUnique: m.findUnique },
      lessonQuizAnswer: { groupBy: m.groupBy },
      auditLog: { findMany: m.auditFindMany },
      $transaction: (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    },
  };
});

const { applyLessonUpdate, findLessonsDir, lessonHash, lessonSyncOverview, readRepositoryLessons } =
  await import("../lesson-sync.service");

const BODY = `# Les listes

Une liste garde ses éléments dans l'ordre, et on les lit par leur position.

<Quiz id="indice" question="Que renvoie notes[1] ?" options={["12", "15"]} correct={1} />`;

function file(refCode: string, body = BODY, extra = ""): string {
  return `---
refCode: ${refCode}
slug: lecon-${refCode.slice(7, 10)}
title: Listes et tuples
description: Ranger plusieurs valeurs dans une seule variable, et les relire.
category: DEV
difficulty: BEGINNER
estimatedMinutes: 20
xpReward: 50
prerequisites: []
${extra}---

${body}
`;
}

/** The lesson row the database would return for a file with this body. */
function row(refCode: string, body = BODY, over: Record<string, unknown> = {}) {
  return {
    id: `id-${refCode}`,
    refCode,
    slug: `lecon-${refCode.slice(7, 10)}`,
    status: "PUBLISHED",
    updatedAt: new Date("2026-09-01T10:00:00Z"),
    contentMdx: body,
    title: "Listes et tuples",
    description: "Ranger plusieurs valeurs dans une seule variable, et les relire.",
    category: "DEV",
    difficulty: "BEGINNER",
    estimatedMinutes: 20,
    xpReward: 50,
    prerequisites: [] as { prerequisite: { refCode: string } }[],
    ...over,
  };
}

function hashOf(r: ReturnType<typeof row>): string {
  return lessonHash({
    contentMdx: r.contentMdx,
    title: r.title,
    description: r.description,
    category: r.category,
    difficulty: r.difficulty,
    estimatedMinutes: r.estimatedMinutes,
    xpReward: r.xpReward,
    prerequisites: r.prerequisites.map((p) => p.prerequisite.refCode).sort(),
  });
}

let root: string;
let dir: string;

function write(rel: string, content: string): void {
  const full = path.join(dir, rel);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content);
}

beforeEach(() => {
  vi.clearAllMocks();
  root = mkdtempSync(path.join(tmpdir(), "cl-sync-"));
  dir = path.join(root, "content", "lessons");
  mkdirSync(dir, { recursive: true });
  m.groupBy.mockResolvedValue([]);
  m.auditFindMany.mockResolvedValue([]);
  m.updateMany.mockResolvedValue({ count: 1 });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("finding and reading the repository's lessons", () => {
  it("finds content/lessons from a folder below the repository root", () => {
    const deep = path.join(root, "apps", "admin");
    mkdirSync(deep, { recursive: true });
    expect(findLessonsDir(deep)).toBe(dir);
  });

  it("reports it missing rather than guessing", () => {
    expect(findLessonsDir(mkdtempSync(path.join(tmpdir(), "cl-none-")))).toBeNull();
  });

  it("reads the .mdx files of every sub-folder, in order, and nothing else", async () => {
    write("python/05-listes.mdx", "a");
    write("cyber/01-bases.mdx", "b");
    write("python/notes.txt", "c");
    const files = await readRepositoryLessons(dir);
    expect(files.map((f) => f.file)).toEqual(["cyber/01-bases.mdx", "python/05-listes.mdx"]);
  });
});

describe("lessonSyncOverview", () => {
  it("says so when the files did not ship", async () => {
    expect((await lessonSyncOverview(null)).available).toBe(false);
  });

  it("counts a lesson that matches its file, and lists nothing for it", async () => {
    write("python/05.mdx", file("CL-LSN-005-V01"));
    m.findMany.mockResolvedValue([row("CL-LSN-005-V01")]);
    const o = await lessonSyncOverview(dir);
    expect(o).toMatchObject({ available: true, unchanged: 1, updates: [], notImported: [] });
  });

  it("shows what an edited file would change, with the fingerprint of the lesson as it is", async () => {
    const edited = BODY.replace("Une liste garde", "Une liste Python garde");
    write("python/05.mdx", file("CL-LSN-005-V01", edited));
    const r = row("CL-LSN-005-V01");
    m.findMany.mockResolvedValue([r]);
    const [u] = (await lessonSyncOverview(dir)).updates;
    expect(u).toMatchObject({
      refCode: "CL-LSN-005-V01",
      file: "python/05.mdx",
      added: 1,
      removed: 1,
    });
    expect(u?.hash).toBe(hashOf(r));
    expect(u?.hunks[0]?.lines.some((l) => l.kind === "added" && l.text.includes("Python"))).toBe(
      true,
    );
    expect(u?.fields).toEqual([]);
  });

  it("lists a changed field with its old and new value", async () => {
    write("python/05.mdx", file("CL-LSN-005-V01").replace("xpReward: 50", "xpReward: 80"));
    m.findMany.mockResolvedValue([row("CL-LSN-005-V01")]);
    const [u] = (await lessonSyncOverview(dir)).updates;
    expect(u?.fields).toEqual([{ field: "xpReward", label: "XP", before: "50", after: "80" }]);
  });

  it("separates files not imported yet, and files it cannot read", async () => {
    write("a.mdx", file("CL-LSN-001-V01"));
    write("b.mdx", "---\nrefCode: pas-un-refcode\n---\n\nTexte");
    m.findMany.mockResolvedValue([]);
    const o = await lessonSyncOverview(dir);
    expect(o.notImported).toEqual([
      { file: "a.mdx", refCode: "CL-LSN-001-V01", title: "Listes et tuples" },
    ]);
    expect(o.unreadable[0]?.file).toBe("b.mdx");
  });

  it("warns about a quiz whose answer changes when learners already answered it", async () => {
    write("python/05.mdx", file("CL-LSN-005-V01", BODY.replace("correct={1}", "correct={0}")));
    m.findMany.mockResolvedValue([row("CL-LSN-005-V01")]);
    m.groupBy.mockResolvedValue([
      { lessonId: "id-CL-LSN-005-V01", quizId: "indice", _count: { _all: 3 } },
    ]);
    const [u] = (await lessonSyncOverview(dir)).updates;
    expect(u?.quizImpacts).toEqual([{ quizId: "indice", answers: 3, change: "modified" }]);
  });

  it("warns about console edits made since the lesson last came from a file", async () => {
    write("python/05.mdx", file("CL-LSN-005-V01", `${BODY}\n\nFin.`));
    m.findMany.mockResolvedValue([row("CL-LSN-005-V01")]);
    const edited = new Date("2026-09-10T08:00:00Z");
    m.auditFindMany.mockResolvedValue([
      { targetId: "id-CL-LSN-005-V01", action: "lesson.update", createdAt: edited },
      { targetId: "id-CL-LSN-005-V01", action: "lesson.import.success", createdAt: new Date(0) },
    ]);
    expect((await lessonSyncOverview(dir)).updates[0]?.editedInConsoleAt).toEqual(edited);

    m.auditFindMany.mockResolvedValue([
      { targetId: "id-CL-LSN-005-V01", action: "lesson.sync", createdAt: new Date() },
      { targetId: "id-CL-LSN-005-V01", action: "lesson.update", createdAt: edited },
    ]);
    expect((await lessonSyncOverview(dir)).updates[0]?.editedInConsoleAt).toBeNull();
  });

  it("points out a different slug, which the update will not touch", async () => {
    write(
      "python/05.mdx",
      file("CL-LSN-005-V01", `${BODY}\n\nFin.`).replace("slug: lecon-005", "slug: listes"),
    );
    m.findMany.mockResolvedValue([row("CL-LSN-005-V01")]);
    const [u] = (await lessonSyncOverview(dir)).updates;
    expect(u?.slugDiffers).toEqual({ database: "lecon-005", file: "listes" });
  });
});

describe("applyLessonUpdate", () => {
  const edited = BODY.replace("Une liste garde", "Une liste Python garde");

  it("writes the file's content, conditioned on the row not having moved, and logs it", async () => {
    write("python/05.mdx", file("CL-LSN-005-V01", edited));
    const r = row("CL-LSN-005-V01");
    m.findUnique.mockResolvedValue(r);
    m.findMany.mockResolvedValue([]);

    const result = await applyLessonUpdate("CL-LSN-005-V01", hashOf(r), "admin-1", dir);

    expect(result).toEqual({ ok: true, lessonId: r.id });
    const [args] = m.updateMany.mock.calls[0] as [{ where: unknown; data: { contentMdx: string } }];
    expect(args.where).toEqual({ id: r.id, updatedAt: r.updatedAt });
    expect(args.data.contentMdx).toContain("Une liste Python garde");
    expect(args.data).not.toHaveProperty("slug");
    expect(args.data).not.toHaveProperty("status");
    expect(m.prereqDelete).toHaveBeenCalledWith({ where: { lessonId: r.id } });
    const [audit] = m.auditCreate.mock.calls[0] as [{ data: { action: string; actorId: string } }];
    expect(audit.data).toMatchObject({ action: "lesson.sync", actorId: "admin-1" });
  });

  it("writes nothing when the lesson changed since it was shown", async () => {
    write("python/05.mdx", file("CL-LSN-005-V01", edited));
    m.findUnique.mockResolvedValue(
      row("CL-LSN-005-V01", "Modifié entre-temps dans l'éditeur, assez long."),
    );
    const result = await applyLessonUpdate(
      "CL-LSN-005-V01",
      hashOf(row("CL-LSN-005-V01")),
      "admin-1",
      dir,
    );
    expect(result).toMatchObject({ ok: false, reason: "stale" });
    expect(m.updateMany).not.toHaveBeenCalled();
  });

  it("logs nothing when an edit lands between the check and the write", async () => {
    write("python/05.mdx", file("CL-LSN-005-V01", edited));
    const r = row("CL-LSN-005-V01");
    m.findUnique.mockResolvedValue(r);
    m.findMany.mockResolvedValue([]);
    m.updateMany.mockResolvedValue({ count: 0 });
    const result = await applyLessonUpdate("CL-LSN-005-V01", hashOf(r), "admin-1", dir);
    expect(result).toMatchObject({ ok: false, reason: "stale" });
    expect(m.auditCreate).not.toHaveBeenCalled();
    expect(m.prereqDelete).not.toHaveBeenCalled();
  });

  it("refuses a file the import would refuse", async () => {
    write("python/05.mdx", file("CL-LSN-005-V01", `${BODY}\n\n<script>alert(1)</script>`));
    const result = await applyLessonUpdate("CL-LSN-005-V01", "0".repeat(64), "admin-1", dir);
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(m.updateMany).not.toHaveBeenCalled();
  });

  it("refuses a prerequisite that is not in the database", async () => {
    write(
      "python/05.mdx",
      file("CL-LSN-005-V01", edited).replace(
        "prerequisites: []",
        'prerequisites: ["CL-LSN-004-V01"]',
      ),
    );
    const r = row("CL-LSN-005-V01");
    m.findUnique.mockResolvedValue(r);
    m.findMany.mockResolvedValue([]);
    const result = await applyLessonUpdate("CL-LSN-005-V01", hashOf(r), "admin-1", dir);
    expect(result).toMatchObject({ ok: false, reason: "prerequisite" });
    expect(m.updateMany).not.toHaveBeenCalled();
  });

  it("finds nothing to write for a refCode no file declares, or with no files at all", async () => {
    expect(await applyLessonUpdate("CL-LSN-099-V01", "0".repeat(64), "admin-1", dir)).toMatchObject(
      {
        ok: false,
        reason: "not_found",
      },
    );
    expect(
      await applyLessonUpdate("CL-LSN-099-V01", "0".repeat(64), "admin-1", null),
    ).toMatchObject({
      ok: false,
      reason: "unavailable",
    });
  });
});
