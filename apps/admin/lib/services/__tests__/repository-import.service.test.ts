import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as Catalogue from "@cyberlearn/db/catalogue";
import type * as LessonImport from "../lesson-import.service";

const m = vi.hoisted(() => ({
  lessonFindMany: vi.fn(),
  pathFindMany: vi.fn(),
  lessonUpdateMany: vi.fn(),
  pathUpdateMany: vi.fn(),
  auditCreate: vi.fn(),
  validateMdxContent: vi.fn(),
  importValidatedLesson: vi.fn(),
  syncPath: vi.fn(),
  syncQuiz: vi.fn(),
  pathFindUnique: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => ({
  prisma: {
    lesson: { findMany: m.lessonFindMany, updateMany: m.lessonUpdateMany },
    path: { findMany: m.pathFindMany, findUnique: m.pathFindUnique, updateMany: m.pathUpdateMany },
    auditLog: { create: m.auditCreate },
    $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
  },
}));

vi.mock("@cyberlearn/db/catalogue", async (importOriginal) => ({
  ...(await importOriginal<typeof Catalogue>()),
  syncPath: m.syncPath,
  syncQuiz: m.syncQuiz,
}));

vi.mock("../lesson-import.service", async (importOriginal) => ({
  ...(await importOriginal<typeof LessonImport>()),
  validateMdxContent: m.validateMdxContent,
  importValidatedLesson: m.importValidatedLesson,
}));

const {
  catalogueDrafts,
  importLessonFromRepository,
  pathSyncOverview,
  publishCatalogueDrafts,
  quizSyncOverview,
  syncPathFromRepository,
  syncQuizFromRepository,
} = await import("../repository-import.service");

let root: string;

function write(rel: string, content: string): void {
  const full = path.join(root, rel);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content);
}

beforeEach(() => {
  vi.clearAllMocks();
  root = mkdtempSync(path.join(tmpdir(), "cl-repo-import-"));
  m.auditCreate.mockResolvedValue({});
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

// ── Lessons ──────────────────────────────────────────────────────────────────

const LESSON = `---
refCode: CL-LSN-01008-V01
slug: fondamentaux-le-bit-et-l-octet
title: "Le bit et l'octet"
---

Corps de la leçon.
`;

const METADATA = { refCode: "CL-LSN-01008-V01", prerequisites: [] };

describe("importLessonFromRepository", () => {
  it("says so when the files did not ship", async () => {
    const result = await importLessonFromRepository("CL-LSN-01008-V01", "admin-1", null);
    expect(result).toMatchObject({ ok: false, reason: "unavailable" });
  });

  it("refuses a refCode no file declares", async () => {
    write("lessons/f1/01008-le-bit.mdx", LESSON);
    const result = await importLessonFromRepository(
      "CL-LSN-01009-V01",
      "admin-1",
      path.join(root, "lessons"),
    );
    expect(result).toMatchObject({ ok: false, reason: "not_found" });
    expect(m.validateMdxContent).not.toHaveBeenCalled();
  });

  it("passes on what the import pipeline refuses, and writes nothing", async () => {
    write("lessons/f1/01008-le-bit.mdx", LESSON);
    const errors = [{ field: "prerequisites", message: "Prerequis introuvable: CL-LSN-01007-V01" }];
    m.validateMdxContent.mockResolvedValue({ valid: false, errors, warnings: [] });
    const result = await importLessonFromRepository(
      "CL-LSN-01008-V01",
      "admin-1",
      path.join(root, "lessons"),
    );
    expect(result).toEqual({
      ok: false,
      reason: "invalid",
      message: "f1/01008-le-bit.mdx ne passe pas les contrôles de l'import.",
      errors,
    });
    expect(m.importValidatedLesson).not.toHaveBeenCalled();
    expect(m.auditCreate).not.toHaveBeenCalled();
  });

  it("imports the file as the import page would, and records where it came from", async () => {
    write("lessons/f1/01008-le-bit.mdx", LESSON);
    m.validateMdxContent.mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
      metadata: METADATA,
      body: "Corps de la leçon.",
    });
    m.importValidatedLesson.mockResolvedValue({
      lessonId: "lesson-1",
      refCode: "CL-LSN-01008-V01",
      contentHash: "x",
    });

    const result = await importLessonFromRepository(
      "CL-LSN-01008-V01",
      "admin-1",
      path.join(root, "lessons"),
    );

    expect(result).toEqual({ ok: true, lessonId: "lesson-1" });
    expect(m.validateMdxContent).toHaveBeenCalledWith(LESSON);
    expect(m.importValidatedLesson).toHaveBeenCalledWith(METADATA, "Corps de la leçon.", "admin-1");
    expect(m.auditCreate.mock.calls[0]?.[0]).toMatchObject({
      data: {
        actorId: "admin-1",
        action: "lesson.import.success",
        targetId: "lesson-1",
        metadata: {
          refCode: "CL-LSN-01008-V01",
          source: "repository",
          file: "f1/01008-le-bit.mdx",
        },
      },
    });
  });

  it("reports a lesson another tab has just imported instead of failing", async () => {
    write("lessons/f1/01008-le-bit.mdx", LESSON);
    m.validateMdxContent.mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
      metadata: METADATA,
      body: "Corps",
    });
    m.importValidatedLesson.mockRejectedValue(
      Object.assign(new Error("unique"), { code: "P2002" }),
    );
    const result = await importLessonFromRepository(
      "CL-LSN-01008-V01",
      "admin-1",
      path.join(root, "lessons"),
    );
    expect(result).toMatchObject({ ok: false, reason: "conflict" });
    expect(m.auditCreate).not.toHaveBeenCalled();
  });
});

// ── Paths ────────────────────────────────────────────────────────────────────

function manifest(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    refCode: "CL-PATH-103-V01",
    slug: "reseaux",
    title: "Réseaux informatiques",
    description: "Concevoir, configurer et sécuriser un réseau.",
    category: "NETWORK",
    difficulty: "BEGINNER",
    estimatedHours: 70,
    modules: [
      { title: "Les bases", lessons: ["CL-LSN-03001-V01", "CL-LSN-03002-V01"] },
      { title: "L'adressage", lessons: ["CL-LSN-03003-V01"] },
    ],
    ...overrides,
  });
}

/** The path row the database holds once the manifest was synced with these lessons. */
function syncedRow(lessons: { refCode: string; module: number }[]) {
  return {
    id: "path-1",
    refCode: "CL-PATH-103-V01",
    status: "DRAFT",
    title: "Réseaux informatiques",
    description: "Concevoir, configurer et sécuriser un réseau.",
    category: "NETWORK",
    track: "SKILL",
    difficulty: "BEGINNER",
    estimatedHours: 70,
    modules: [
      { position: 1, title: "Les bases", description: null },
      { position: 2, title: "L'adressage", description: null },
    ],
    lessons: lessons.map((l) => ({
      lesson: { refCode: l.refCode },
      module: { position: l.module },
    })),
  };
}

describe("pathSyncOverview", () => {
  it("says so when the manifests did not ship", async () => {
    expect(await pathSyncOverview(null)).toEqual({ available: false, errors: [], paths: [] });
  });

  it("marks a path the database does not have as new", async () => {
    write("paths/reseaux.json", manifest());
    m.lessonFindMany.mockResolvedValue([{ refCode: "CL-LSN-03001-V01" }]);
    m.pathFindMany.mockResolvedValue([]);
    const overview = await pathSyncOverview(path.join(root, "paths"));
    expect(overview.errors).toEqual([]);
    expect(overview.paths).toEqual([
      expect.objectContaining({
        refCode: "CL-PATH-103-V01",
        file: "reseaux.json",
        modules: 2,
        lessons: 3,
        importedLessons: 1,
        database: null,
        upToDate: false,
      }),
    ]);
  });

  it("sees a path in sync with the lessons already imported", async () => {
    write("paths/reseaux.json", manifest());
    m.lessonFindMany.mockResolvedValue([
      { refCode: "CL-LSN-03001-V01" },
      { refCode: "CL-LSN-03002-V01" },
    ]);
    m.pathFindMany.mockResolvedValue([
      syncedRow([
        { refCode: "CL-LSN-03001-V01", module: 1 },
        { refCode: "CL-LSN-03002-V01", module: 1 },
      ]),
    ]);
    const [state] = (await pathSyncOverview(path.join(root, "paths"))).paths;
    expect(state).toMatchObject({ database: { id: "path-1", status: "DRAFT" }, upToDate: true });
  });

  it("asks for a sync once a lesson of the manifest is imported but not attached", async () => {
    write("paths/reseaux.json", manifest());
    m.lessonFindMany.mockResolvedValue([
      { refCode: "CL-LSN-03001-V01" },
      { refCode: "CL-LSN-03002-V01" },
      { refCode: "CL-LSN-03003-V01" },
    ]);
    m.pathFindMany.mockResolvedValue([
      syncedRow([
        { refCode: "CL-LSN-03001-V01", module: 1 },
        { refCode: "CL-LSN-03002-V01", module: 1 },
      ]),
    ]);
    const [state] = (await pathSyncOverview(path.join(root, "paths"))).paths;
    expect(state?.upToDate).toBe(false);
  });

  it("asks for a sync when the manifest renamed a module", async () => {
    write(
      "paths/reseaux.json",
      manifest({
        modules: [
          { title: "Les fondations", lessons: ["CL-LSN-03001-V01", "CL-LSN-03002-V01"] },
          { title: "L'adressage", lessons: ["CL-LSN-03003-V01"] },
        ],
      }),
    );
    m.lessonFindMany.mockResolvedValue([{ refCode: "CL-LSN-03001-V01" }]);
    m.pathFindMany.mockResolvedValue([syncedRow([{ refCode: "CL-LSN-03001-V01", module: 1 }])]);
    const [state] = (await pathSyncOverview(path.join(root, "paths"))).paths;
    expect(state?.upToDate).toBe(false);
  });
});

describe("syncPathFromRepository", () => {
  it("writes nothing while a manifest fails its check", async () => {
    write("paths/reseaux.json", manifest({ slug: "autre" }));
    const result = await syncPathFromRepository(
      "CL-PATH-103-V01",
      "admin-1",
      path.join(root, "paths"),
    );
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(result.ok ? [] : result.details).toEqual([
      "reseaux.json : le fichier doit s'appeler autre.json, comme son slug.",
    ]);
    expect(m.syncPath).not.toHaveBeenCalled();
  });

  it("refuses a refCode no manifest declares", async () => {
    write("paths/reseaux.json", manifest());
    const result = await syncPathFromRepository(
      "CL-PATH-199-V01",
      "admin-1",
      path.join(root, "paths"),
    );
    expect(result).toMatchObject({ ok: false, reason: "not_found" });
    expect(m.syncPath).not.toHaveBeenCalled();
  });

  it("writes the path from its manifest and records it", async () => {
    write("paths/reseaux.json", manifest());
    m.syncPath.mockResolvedValue({
      pathId: "path-1",
      created: true,
      attached: 2,
      missing: ["CL-LSN-03003-V01"],
      leftovers: [],
    });

    const result = await syncPathFromRepository(
      "CL-PATH-103-V01",
      "admin-1",
      path.join(root, "paths"),
    );

    expect(result).toEqual({ ok: true, created: true, attached: 2, missing: 1 });
    expect(m.syncPath).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        refCode: "CL-PATH-103-V01",
        track: "SKILL",
        modules: [
          { title: "Les bases", description: null },
          { title: "L'adressage", description: null },
        ],
        lessons: [
          { refCode: "CL-LSN-03001-V01", moduleIndex: 0 },
          { refCode: "CL-LSN-03002-V01", moduleIndex: 0 },
          { refCode: "CL-LSN-03003-V01", moduleIndex: 1 },
        ],
      }),
    );
    expect(m.auditCreate.mock.calls[0]?.[0]).toMatchObject({
      data: { actorId: "admin-1", action: "path.sync", targetType: "path", targetId: "path-1" },
    });
  });
});

// ── Exams ────────────────────────────────────────────────────────────────────

const QUESTION = {
  question: "Que vaut 2 + 2 ?",
  options: [
    { id: "a", text: "3" },
    { id: "b", text: "4" },
  ],
  correctOptionId: "b",
  explanation: "Deux plus deux font quatre.",
};

function exam(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    passThreshold: 75,
    questionsToDraw: 1,
    questions: [QUESTION],
    ...overrides,
  });
}

const STORED_QUIZ = {
  passThreshold: 75,
  questionsToDraw: 1,
  isActive: true,
  questions: [{ ...QUESTION, isActive: true }],
};

describe("quizSyncOverview", () => {
  it("says so when the exams did not ship", async () => {
    expect(await quizSyncOverview(null)).toEqual({ available: false, errors: [], quizzes: [] });
  });

  it("tells a new exam, one in sync, one out of date and one whose path is missing", async () => {
    write("quizzes/reseaux.json", exam());
    write("quizzes/linux.json", exam());
    write("quizzes/python.json", exam({ passThreshold: 80 }));
    write("quizzes/absent.json", exam());
    m.pathFindMany.mockResolvedValue([
      { id: "p-1", slug: "reseaux", title: "Réseaux", quiz: null },
      { id: "p-2", slug: "linux", title: "Linux", quiz: STORED_QUIZ },
      { id: "p-3", slug: "python", title: "Python", quiz: STORED_QUIZ },
    ]);

    const overview = await quizSyncOverview(path.join(root, "quizzes"));

    const bySlug = Object.fromEntries(overview.quizzes.map((q) => [q.slug, q]));
    expect(bySlug.reseaux).toMatchObject({ exists: false, upToDate: false, path: { id: "p-1" } });
    expect(bySlug.linux).toMatchObject({ exists: true, upToDate: true });
    expect(bySlug.python).toMatchObject({ exists: true, upToDate: false, passThreshold: 80 });
    expect(bySlug.absent).toMatchObject({ path: null, upToDate: false });
  });

  it("lists a broken file instead of syncing it", async () => {
    write("quizzes/reseaux.json", exam({ questionsToDraw: 5 }));
    m.pathFindMany.mockResolvedValue([]);
    const overview = await quizSyncOverview(path.join(root, "quizzes"));
    expect(overview.quizzes).toEqual([]);
    expect(overview.errors.join("\n")).toContain("questionsToDraw (5)");
  });
});

describe("syncQuizFromRepository", () => {
  it("refuses a file that fails its check, and writes nothing", async () => {
    write("quizzes/reseaux.json", exam({ passThreshold: 150 }));
    const result = await syncQuizFromRepository("reseaux", "admin-1", path.join(root, "quizzes"));
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(m.syncQuiz).not.toHaveBeenCalled();
  });

  it("is not stopped by another path's broken exam", async () => {
    write("quizzes/reseaux.json", exam());
    write("quizzes/linux.json", "{ pas du json");
    m.pathFindUnique.mockResolvedValue({ id: "p-1" });
    m.syncQuiz.mockResolvedValue({ quizId: "q-1", created: true, questions: 1, retired: 0 });
    const result = await syncQuizFromRepository("reseaux", "admin-1", path.join(root, "quizzes"));
    expect(result).toEqual({ ok: true, created: true, questions: 1 });
  });

  it("waits for the path to exist", async () => {
    write("quizzes/reseaux.json", exam());
    m.pathFindUnique.mockResolvedValue(null);
    const result = await syncQuizFromRepository("reseaux", "admin-1", path.join(root, "quizzes"));
    expect(result).toMatchObject({ ok: false, reason: "no_path" });
    expect(m.syncQuiz).not.toHaveBeenCalled();
  });

  it("writes the exam of its path and records it", async () => {
    write("quizzes/reseaux.json", exam());
    m.pathFindUnique.mockResolvedValue({ id: "p-1" });
    m.syncQuiz.mockResolvedValue({ quizId: "q-1", created: false, questions: 1, retired: 2 });

    const result = await syncQuizFromRepository("reseaux", "admin-1", path.join(root, "quizzes"));

    expect(result).toEqual({ ok: true, created: false, questions: 1 });
    expect(m.syncQuiz).toHaveBeenCalledWith(
      expect.anything(),
      "p-1",
      expect.objectContaining({ passThreshold: 75, questionsToDraw: 1 }),
    );
    expect(m.auditCreate.mock.calls[0]?.[0]).toMatchObject({
      data: {
        actorId: "admin-1",
        action: "quiz.sync",
        targetType: "quiz",
        targetId: "q-1",
        metadata: { slug: "reseaux", retired: 2 },
      },
    });
  });
});

describe("catalogue publication", () => {
  it("looks for drafts among what the manifests list, and nothing else", async () => {
    write("paths/reseaux.json", manifest());
    m.lessonFindMany.mockResolvedValue([
      { id: "l-1", refCode: "CL-LSN-03001-V01", title: "Un réseau" },
    ]);
    m.pathFindMany.mockResolvedValue([{ id: "p-1", refCode: "CL-PATH-103-V01", title: "Réseaux" }]);

    const drafts = await catalogueDrafts(path.join(root, "paths"));

    expect(drafts.lessons.map((l) => l.refCode)).toEqual(["CL-LSN-03001-V01"]);
    expect(m.lessonFindMany.mock.calls[0]?.[0]).toMatchObject({
      where: {
        refCode: { in: ["CL-LSN-03001-V01", "CL-LSN-03002-V01", "CL-LSN-03003-V01"] },
        status: "DRAFT",
      },
    });
    expect(m.pathFindMany.mock.calls[0]?.[0]).toMatchObject({
      where: { refCode: { in: ["CL-PATH-103-V01"] }, status: "DRAFT" },
    });
  });

  it("finds no draft to publish while a manifest fails its check", async () => {
    write("paths/reseaux.json", manifest({ slug: "autre" }));
    expect(await catalogueDrafts(path.join(root, "paths"))).toEqual({ lessons: [], paths: [] });
    expect(m.lessonFindMany).not.toHaveBeenCalled();
  });

  it("publishes the drafts it found, only while they are still drafts, and records it", async () => {
    write("paths/reseaux.json", manifest());
    m.lessonFindMany.mockResolvedValue([
      { id: "l-1", refCode: "CL-LSN-03001-V01", title: "Un réseau" },
    ]);
    m.pathFindMany.mockResolvedValue([{ id: "p-1", refCode: "CL-PATH-103-V01", title: "Réseaux" }]);
    m.lessonUpdateMany.mockResolvedValue({ count: 1 });
    m.pathUpdateMany.mockResolvedValue({ count: 1 });

    expect(await publishCatalogueDrafts("admin-1", path.join(root, "paths"))).toEqual({
      lessons: 1,
      paths: 1,
    });
    expect(m.lessonUpdateMany.mock.calls[0]?.[0]).toMatchObject({
      where: { id: { in: ["l-1"] }, status: "DRAFT" },
      data: { status: "PUBLISHED" },
    });
    expect(m.pathUpdateMany.mock.calls[0]?.[0]).toMatchObject({
      where: { id: { in: ["p-1"] }, status: "DRAFT" },
      data: { status: "PUBLISHED" },
    });
    expect(m.auditCreate.mock.calls[0]?.[0]).toMatchObject({
      data: {
        actorId: "admin-1",
        action: "catalogue.publish",
        metadata: { lessons: ["CL-LSN-03001-V01"], paths: ["CL-PATH-103-V01"] },
      },
    });
  });

  it("writes nothing when there is nothing to publish", async () => {
    write("paths/reseaux.json", manifest());
    m.lessonFindMany.mockResolvedValue([]);
    m.pathFindMany.mockResolvedValue([]);
    expect(await publishCatalogueDrafts("admin-1", path.join(root, "paths"))).toEqual({
      lessons: 0,
      paths: 0,
    });
    expect(m.lessonUpdateMany).not.toHaveBeenCalled();
    expect(m.auditCreate).not.toHaveBeenCalled();
  });
});
