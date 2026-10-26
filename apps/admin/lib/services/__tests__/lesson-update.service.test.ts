import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The write behind both doors a file comes over a lesson by: the sync page
 * (its cases are in lesson-sync.service.test.ts) and the import of a file
 * whose refCode is taken, whose own wording and audit line are checked here.
 */

const m = vi.hoisted(() => ({
  findByRefCode: vi.fn(),
  links: vi.fn(),
  write: vi.fn(),
  edges: vi.fn(),
  refCodes: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => ({
  lessonFileRepository: {
    findByRefCode: m.findByRefCode,
    findByRefCodesForLinks: m.links,
    writeFromFile: m.write,
    refCodesByIds: m.refCodes,
  },
  lessonRepository: { findPrerequisiteEdges: m.edges },
}));

const { applyLessonContentUpdate, compareLesson, fieldsOfRow, lessonHash } = await import(
  "../lesson-update.service"
);

const BODY = "## Une section\n\nUn contenu de test parfaitement ordinaire.";

const FILE = `---
refCode: CL-LSN-001-V01
slug: lecon-test
title: Une lecon de test
description: Une description suffisamment longue pour le schema de validation.
category: DEV
difficulty: BEGINNER
estimatedMinutes: 10
xpReward: 50
prerequisites: []
---

${BODY}
`;

const ROW = {
  id: "lesson-1",
  refCode: "CL-LSN-001-V01",
  slug: "lecon-test",
  status: "PUBLISHED" as const,
  updatedAt: new Date("2026-09-01T10:00:00Z"),
  contentMdx: "## Une section\n\nL'ancien contenu.",
  title: "Une lecon de test",
  description: "Une description suffisamment longue pour le schema de validation.",
  category: "DEV" as const,
  difficulty: "BEGINNER" as const,
  estimatedMinutes: 10,
  xpReward: 30,
  prerequisites: [],
};

const SEEN = lessonHash(fieldsOfRow(ROW));

beforeEach(() => {
  vi.clearAllMocks();
  m.findByRefCode.mockResolvedValue(ROW);
  m.links.mockResolvedValue([]);
  m.write.mockResolvedValue({ ok: true, version: 4, draftKept: false });
  m.edges.mockResolvedValue([]);
  m.refCodes.mockImplementation((ids: string[]) =>
    Promise.resolve(new Map(ids.map((id) => [id, CODES[id] ?? id]))),
  );
});

/** The refCodes of the lessons the loop cases name. */
const CODES: Record<string, string> = {
  "lesson-1": "CL-LSN-001-V01",
  "lesson-2": "CL-LSN-002-V01",
  "lesson-3": "CL-LSN-003-V01",
};

/** FILE, requiring these lessons. */
function requiring(...refCodes: string[]): string {
  return FILE.replace(
    "prerequisites: []",
    `prerequisites: [${refCodes.map((r) => `"${r}"`).join(", ")}]`,
  );
}

describe("applyLessonContentUpdate from the import", () => {
  it("writes the file over the lesson and logs lesson.import.update", async () => {
    const result = await applyLessonContentUpdate(FILE, SEEN, "admin-1", {
      kind: "import",
      file: "lecon.mdx",
    });
    expect(result).toEqual({ ok: true, lessonId: "lesson-1", version: 4, draftKept: false });
    const [write] = m.write.mock.calls[0] as [
      { fields: { contentMdx: string; xpReward: number }; audit: Record<string, unknown> },
    ];
    expect(write.fields).toMatchObject({ contentMdx: BODY, xpReward: 50 });
    expect(write.audit).toEqual({
      actorId: "admin-1",
      action: "lesson.import.update",
      metadata: {
        refCode: "CL-LSN-001-V01",
        file: "lecon.mdx",
        contentHash: expect.stringMatching(/^[a-f0-9]{64}$/) as unknown,
        source: "import",
      },
    });
  });

  it("asks to validate again when the lesson changed since it was shown", async () => {
    const result = await applyLessonContentUpdate(FILE, "0".repeat(64), "admin-1", {
      kind: "import",
      file: "lecon.mdx",
    });
    expect(result).toEqual({
      ok: false,
      reason: "stale",
      message:
        "La leçon a changé depuis la validation. Valide de nouveau le lot pour voir les différences à jour.",
    });
    expect(m.write).not.toHaveBeenCalled();
  });

  it("says the lesson is gone when it left the database meanwhile", async () => {
    m.findByRefCode.mockResolvedValue(null);
    const result = await applyLessonContentUpdate(FILE, SEEN, "admin-1", {
      kind: "import",
      file: "lecon.mdx",
    });
    expect(result).toMatchObject({ ok: false, reason: "not_found" });
    expect(m.write).not.toHaveBeenCalled();
  });

  it("refuses a file the import refuses, with its problems", async () => {
    const result = await applyLessonContentUpdate(
      FILE.replace("xpReward: 50", "xpReward: -1"),
      SEEN,
      "admin-1",
      { kind: "import", file: "lecon.mdx" },
    );
    expect(result).toMatchObject({
      ok: false,
      reason: "invalid",
      message: "lecon.mdx ne passe pas les contrôles de l'import.",
      errors: [{ field: "xpReward", line: 9 }],
    });
    expect(m.findByRefCode).not.toHaveBeenCalled();
  });
});

describe("applyLessonContentUpdate and prerequisite loops", () => {
  const source = { kind: "import", file: "lecon.mdx" } as const;

  it("refuses a lesson that requires itself", async () => {
    m.links.mockResolvedValue([{ id: "lesson-1", refCode: "CL-LSN-001-V01" }]);
    const result = await applyLessonContentUpdate(
      requiring("CL-LSN-001-V01"),
      SEEN,
      "admin-1",
      source,
    );
    expect(result).toEqual({
      ok: false,
      reason: "prerequisite",
      message:
        "Ces prérequis forment une boucle : CL-LSN-001-V01 → CL-LSN-001-V01. Aucune de ces leçons ne pourrait s'ouvrir.",
    });
    expect(m.write).not.toHaveBeenCalled();
  });

  it("refuses a prerequisite that already requires the lesson, through the catalogue", async () => {
    m.links.mockResolvedValue([{ id: "lesson-2", refCode: "CL-LSN-002-V01" }]);
    m.edges.mockResolvedValue([
      { lessonId: "lesson-2", prerequisiteId: "lesson-3" },
      { lessonId: "lesson-3", prerequisiteId: "lesson-1" },
    ]);
    const result = await applyLessonContentUpdate(
      requiring("CL-LSN-002-V01"),
      SEEN,
      "admin-1",
      source,
    );
    expect(result).toMatchObject({
      ok: false,
      reason: "prerequisite",
      message: expect.stringContaining(
        "CL-LSN-001-V01 → CL-LSN-002-V01 → CL-LSN-003-V01 → CL-LSN-001-V01",
      ) as unknown,
    });
    expect(m.write).not.toHaveBeenCalled();
  });

  it("writes prerequisites that lead nowhere back", async () => {
    m.links.mockResolvedValue([{ id: "lesson-2", refCode: "CL-LSN-002-V01" }]);
    m.edges.mockResolvedValue([
      { lessonId: "lesson-2", prerequisiteId: "lesson-3" },
      { lessonId: "lesson-3", prerequisiteId: "lesson-9" },
    ]);
    const result = await applyLessonContentUpdate(
      requiring("CL-LSN-002-V01"),
      SEEN,
      "admin-1",
      source,
    );
    expect(result).toEqual({ ok: true, lessonId: "lesson-1", version: 4, draftKept: false });
    const [write] = m.write.mock.calls[0] as [{ prerequisiteIds: string[] }];
    expect(write.prerequisiteIds).toEqual(["lesson-2"]);
  });

  it("keeps a CRLF body as stored when the file only changes the prerequisites", async () => {
    // Stored with CRLF (a file imported as it was): the comparison reads the
    // same text, so the write must too, or the publish would see a change.
    const crlf = { ...ROW, contentMdx: BODY.replaceAll("\n", "\r\n"), xpReward: 50 };
    m.findByRefCode.mockResolvedValue(crlf);
    m.links.mockResolvedValue([{ id: "lesson-2", refCode: "CL-LSN-002-V01" }]);
    const result = await applyLessonContentUpdate(
      requiring("CL-LSN-002-V01"),
      lessonHash(fieldsOfRow(crlf)),
      "admin-1",
      source,
    );
    expect(result).toMatchObject({ ok: true });
    const [write] = m.write.mock.calls[0] as [{ fields: { contentMdx: string } }];
    expect(write.fields.contentMdx).toBe(crlf.contentMdx);
  });

  it("reads no link for a file without prerequisites", async () => {
    await applyLessonContentUpdate(FILE, SEEN, "admin-1", source);
    expect(m.edges).not.toHaveBeenCalled();
  });
});

describe("compareLesson", () => {
  const context = {
    answers: new Map<string, number>(),
    editedInConsoleAt: null,
    draftSavedAt: null,
  };
  const lines = (word: string, count: number): string =>
    Array.from({ length: count }, (_, i) => `${word} ${String(i)}`).join(String.fromCharCode(10));

  it("shows the passages of a content compared line by line", () => {
    const preview = compareLesson(
      ROW,
      { slug: ROW.slug, fields: fieldsOfRow({ ...ROW, contentMdx: BODY }) },
      context,
    );
    expect(preview).toMatchObject({ added: 1, removed: 1, hunksOmitted: false });
    expect(preview.hunks).toHaveLength(1);
  });

  it("mentions an open studio draft only when the content changes", () => {
    const saved = new Date("2026-10-18T09:30:00Z");
    const withDraft = { ...context, draftSavedAt: saved };
    const prerequisitesOnly = {
      slug: ROW.slug,
      fields: { ...fieldsOfRow(ROW), prerequisites: ["CL-LSN-002-V01"] },
    };
    // Same content, same fingerprint: the draft's base still holds.
    expect(compareLesson(ROW, prerequisitesOnly, withDraft).draftSavedAt).toBeNull();

    const retitled = {
      slug: ROW.slug,
      fields: { ...prerequisitesOnly.fields, title: "Un autre titre" },
    };
    expect(compareLesson(ROW, retitled, withDraft).draftSavedAt).toEqual(saved);
  });

  it("counts, without passages, a content rewritten over too many lines to compare", () => {
    const row = { ...ROW, contentMdx: lines("avant", 2_100) };
    const file = {
      slug: ROW.slug,
      fields: fieldsOfRow({ ...ROW, contentMdx: lines("après", 2_100) }),
    };
    expect(compareLesson(row, file, context)).toMatchObject({
      hunks: [],
      hunksOmitted: true,
      added: 2_100,
      removed: 2_100,
    });
  });
});
