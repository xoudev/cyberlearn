import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { configureZodLocale } from "@cyberlearn/types/zod-locale";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  links: vi.fn(),
  answers: vi.fn(),
  edits: vi.fn(),
  write: vi.fn(),
  outside: vi.fn(),
  edges: vi.fn(),
  refCodes: vi.fn(),
}));

// The repository's own queries and its transaction are tested in
// packages/db (lesson-file.test.ts): here, what the service asks of it.
vi.mock("@cyberlearn/db", () => ({
  lessonFileRepository: {
    findByRefCodes: m.findMany,
    findByRefCode: m.findUnique,
    findByRefCodesForLinks: m.links,
    quizAnswerCounts: m.answers,
    consoleEditsSinceFile: m.edits,
    writeFromFile: m.write,
    catalogueLessonsOutside: m.outside,
    refCodesByIds: m.refCodes,
  },
  lessonRepository: { findPrerequisiteEdges: m.edges },
}));

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
  m.answers.mockResolvedValue([]);
  m.edits.mockResolvedValue(new Map());
  m.links.mockResolvedValue([]);
  m.write.mockResolvedValue(true);
  m.outside.mockResolvedValue([]);
  m.edges.mockResolvedValue([]);
  m.refCodes.mockResolvedValue(new Map());
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

  it("lists the catalogue lessons no file holds, which the sync leaves alone", async () => {
    write("a.mdx", file("CL-LSN-001-V01"));
    // Unreadable, but its lesson has a file all the same.
    write("b.mdx", "---\nrefCode: CL-LSN-002-V01\nslug: 12\n---\n\nTexte");
    m.findMany.mockResolvedValue([row("CL-LSN-001-V01")]);
    m.outside.mockResolvedValue([
      { id: "id-900", refCode: "CL-LSN-900-V01", title: "Écrite dans la console", status: "DRAFT" },
    ]);
    const o = await lessonSyncOverview(dir);
    expect(m.outside).toHaveBeenCalledWith(["CL-LSN-001-V01", "CL-LSN-002-V01"]);
    expect(o.onlyInDatabase).toEqual([
      {
        lessonId: "id-900",
        refCode: "CL-LSN-900-V01",
        title: "Écrite dans la console",
        status: "DRAFT",
      },
    ]);
  });

  it("says which values a category it cannot read may take", async () => {
    // As the console's instrumentation sets it, wording an enum for a form.
    configureZodLocale();
    write("a.mdx", file("CL-LSN-001-V01").replace("category: DEV", "category: SECURITY"));
    m.findMany.mockResolvedValue([]);
    const o = await lessonSyncOverview(dir);
    expect(o.unreadable).toEqual([
      {
        file: "a.mdx",
        message: "Frontmatter invalide : category Valeur attendue : DEV, CYBERSEC ou NETWORK.",
      },
    ]);
  });

  it("reads every lesson of the repository: one it cannot read is never imported", async () => {
    // Nor is any lesson that needs it: twenty Linux lessons with a description
    // over the 500 characters of the column were left out, and fifteen others
    // refused for a prerequisite "introuvable".
    const repository = findLessonsDir();
    expect(repository).not.toBeNull();
    m.findMany.mockResolvedValue([]);
    const o = await lessonSyncOverview(repository ?? "");
    expect(o.unreadable).toEqual([]);
    expect(o.notImported.length).toBeGreaterThan(100);
  }, 30_000); // Reads every lesson of the repository: slow when the whole suite runs at once.

  it("lists the files not imported yet so that each follows its prerequisites", async () => {
    const needs = (refCode: string, prereq: string): string =>
      file(refCode).replace("prerequisites: []", `prerequisites: ["${prereq}"]`);
    // Alphabetical order would import 01 before the 02 it needs.
    write("01-suite.mdx", needs("CL-LSN-003-V01", "CL-LSN-002-V01"));
    write("02-base.mdx", file("CL-LSN-002-V01"));
    m.findMany.mockResolvedValue([]);
    const o = await lessonSyncOverview(dir);
    expect(o.notImported.map((n) => n.refCode)).toEqual(["CL-LSN-002-V01", "CL-LSN-003-V01"]);
  });

  it("warns about a quiz whose answer changes when learners already answered it", async () => {
    write("python/05.mdx", file("CL-LSN-005-V01", BODY.replace("correct={1}", "correct={0}")));
    m.findMany.mockResolvedValue([row("CL-LSN-005-V01")]);
    m.answers.mockResolvedValue([{ lessonId: "id-CL-LSN-005-V01", quizId: "indice", answers: 3 }]);
    const [u] = (await lessonSyncOverview(dir)).updates;
    expect(u?.quizImpacts).toEqual([{ quizId: "indice", answers: 3, change: "modified" }]);
  });

  it("warns about console edits made since the lesson last came from a file", async () => {
    write("python/05.mdx", file("CL-LSN-005-V01", `${BODY}\n\nFin.`));
    m.findMany.mockResolvedValue([row("CL-LSN-005-V01")]);
    const edited = new Date("2026-09-10T08:00:00Z");
    m.edits.mockResolvedValue(new Map([["id-CL-LSN-005-V01", edited]]));
    expect((await lessonSyncOverview(dir)).updates[0]?.editedInConsoleAt).toEqual(edited);
    expect(m.edits).toHaveBeenCalledWith(["id-CL-LSN-005-V01"]);

    m.edits.mockResolvedValue(new Map());
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

  it("writes the file's content over the row as it was compared, and logs it", async () => {
    write("python/05.mdx", file("CL-LSN-005-V01", edited));
    const r = row("CL-LSN-005-V01");
    m.findUnique.mockResolvedValue(r);

    const result = await applyLessonUpdate("CL-LSN-005-V01", hashOf(r), "admin-1", dir);

    expect(result).toEqual({ ok: true, lessonId: r.id });
    expect(m.findUnique).toHaveBeenCalledWith("CL-LSN-005-V01");
    const [args] = m.write.mock.calls[0] as [
      {
        lessonId: string;
        expectedUpdatedAt: Date;
        fields: { contentMdx: string };
        prerequisiteIds: string[];
        audit: { action: string; actorId: string; metadata: Record<string, unknown> };
      },
    ];
    expect(args.lessonId).toBe(r.id);
    expect(args.expectedUpdatedAt).toBe(r.updatedAt);
    expect(args.fields.contentMdx).toContain("Une liste Python garde");
    expect(args.fields).not.toHaveProperty("slug");
    expect(args.fields).not.toHaveProperty("status");
    expect(args.prerequisiteIds).toEqual([]);
    expect(args.audit).toMatchObject({
      action: "lesson.sync",
      actorId: "admin-1",
      metadata: { refCode: "CL-LSN-005-V01", file: "python/05.mdx" },
    });
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
    expect(m.write).not.toHaveBeenCalled();
  });

  it("says so when an edit lands between the check and the write", async () => {
    write("python/05.mdx", file("CL-LSN-005-V01", edited));
    const r = row("CL-LSN-005-V01");
    m.findUnique.mockResolvedValue(r);
    m.write.mockResolvedValue(false);
    const result = await applyLessonUpdate("CL-LSN-005-V01", hashOf(r), "admin-1", dir);
    expect(result).toMatchObject({
      ok: false,
      reason: "stale",
      message: "La leçon a été modifiée pendant la mise à jour. Recharge la page.",
    });
  });

  it("refuses a file the import would refuse", async () => {
    write("python/05.mdx", file("CL-LSN-005-V01", `${BODY}\n\n<script>alert(1)</script>`));
    const result = await applyLessonUpdate("CL-LSN-005-V01", "0".repeat(64), "admin-1", dir);
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(m.write).not.toHaveBeenCalled();
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
    const result = await applyLessonUpdate("CL-LSN-005-V01", hashOf(r), "admin-1", dir);
    expect(result).toMatchObject({ ok: false, reason: "prerequisite" });
    expect(m.links).toHaveBeenCalledWith(["CL-LSN-004-V01"]);
    expect(m.write).not.toHaveBeenCalled();
  });

  it("refuses prerequisites that lead back to the lesson, naming the loop", async () => {
    write(
      "python/05.mdx",
      file("CL-LSN-005-V01", edited).replace(
        "prerequisites: []",
        'prerequisites: ["CL-LSN-004-V01"]',
      ),
    );
    const r = row("CL-LSN-005-V01");
    m.findUnique.mockResolvedValue(r);
    m.links.mockResolvedValue([{ id: "id-CL-LSN-004-V01", refCode: "CL-LSN-004-V01" }]);
    m.edges.mockResolvedValue([{ lessonId: "id-CL-LSN-004-V01", prerequisiteId: r.id }]);
    m.refCodes.mockResolvedValue(
      new Map([
        [r.id, "CL-LSN-005-V01"],
        ["id-CL-LSN-004-V01", "CL-LSN-004-V01"],
      ]),
    );
    const result = await applyLessonUpdate("CL-LSN-005-V01", hashOf(r), "admin-1", dir);
    expect(result).toMatchObject({
      ok: false,
      reason: "prerequisite",
      message: expect.stringContaining(
        "CL-LSN-005-V01 → CL-LSN-004-V01 → CL-LSN-005-V01",
      ) as unknown,
    });
    expect(m.write).not.toHaveBeenCalled();
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
