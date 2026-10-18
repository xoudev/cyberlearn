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
}));

vi.mock("@cyberlearn/db", () => ({
  lessonFileRepository: {
    findByRefCode: m.findByRefCode,
    findByRefCodesForLinks: m.links,
    writeFromFile: m.write,
  },
}));

const { applyLessonContentUpdate, fieldsOfRow, lessonHash } = await import(
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
  m.write.mockResolvedValue(true);
});

describe("applyLessonContentUpdate from the import", () => {
  it("writes the file over the lesson and logs lesson.import.update", async () => {
    const result = await applyLessonContentUpdate(FILE, SEEN, "admin-1", {
      kind: "import",
      file: "lecon.mdx",
    });
    expect(result).toEqual({ ok: true, lessonId: "lesson-1" });
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
