import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as LessonUpdate from "@/lib/services/lesson-update.service";

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn(),
  findByRefCode: vi.fn(),
  findIdBySlug: vi.fn(),
  findMany: vi.fn(),
  answers: vi.fn(),
  edits: vi.fn(),
  drafts: vi.fn(),
  create: vi.fn(),
  importCount: vi.fn(),
  auditRecord: vi.fn(),
  apply: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  auditLogRepository: { record: m.auditRecord },
  lessonFileRepository: {
    countImportsSince: m.importCount,
    findByRefCode: m.findByRefCode,
    findIdBySlug: m.findIdBySlug,
    findByRefCodesForLinks: m.findMany,
    quizAnswerCounts: m.answers,
    consoleEditsSinceFile: m.edits,
    openDrafts: m.drafts,
    createFromFile: m.create,
  },
}));
vi.mock("@/lib/services/lesson-update.service", async (importOriginal) => ({
  ...(await importOriginal<typeof LessonUpdate>()),
  applyLessonContentUpdate: m.apply,
}));

import {
  importLessonBatchAction,
  updateLessonFromImportAction,
  validateImportBatchAction,
} from "../actions";

function mdx(refCode: string, slug: string, prereqs: string[] = []): string {
  return `---
refCode: ${refCode}
slug: ${slug}
title: Une lecon de test
description: Une description suffisamment longue pour le schema de validation.
category: DEV
difficulty: BEGINNER
estimatedMinutes: 10
xpReward: 50
prerequisites: [${prereqs.map((p) => `"${p}"`).join(", ")}]
---

# Introduction

Un contenu de test parfaitement ordinaire en Markdown.
`;
}

const HASH = "a".repeat(64);
const HOUR = 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: "admin-1" });
  m.findByRefCode.mockResolvedValue(null);
  m.findIdBySlug.mockResolvedValue(null);
  m.findMany.mockResolvedValue([]);
  m.answers.mockResolvedValue([]);
  m.edits.mockResolvedValue(new Map());
  m.drafts.mockResolvedValue(new Map());
  m.create.mockImplementation((input: { fields: { refCode: string } }) =>
    Promise.resolve({
      lessonId: `id-${input.fields.refCode}`,
      refCode: input.fields.refCode,
      version: 1,
    }),
  );
  m.importCount.mockResolvedValue(0);
  m.auditRecord.mockResolvedValue(undefined);
});

describe("validateImportBatchAction", () => {
  it("downgrades a batch-provided prerequisite to a warning when its provider is valid", async () => {
    const res = await validateImportBatchAction([
      { name: "a.mdx", content: mdx("CL-LSN-001-V01", "lecon-a") },
      { name: "b.mdx", content: mdx("CL-LSN-002-V01", "lecon-b", ["CL-LSN-001-V01"]) },
    ]);

    expect(Array.isArray(res)).toBe(true);
    if (!Array.isArray(res)) return;
    const b = res.find((r) => r.name === "b.mdx");
    expect(b?.result.valid).toBe(true);
    expect(b?.result.warnings.some((w) => w.includes("fourni par le lot"))).toBe(true);
  });

  it("escalates back to an error when the providing sibling is itself invalid", async () => {
    const res = await validateImportBatchAction([
      // Invalid provider: refCode format rejected by the metadata schema.
      { name: "a.mdx", content: mdx("CL-LSN-001-V01", "UPPERCASE INVALID SLUG") },
      { name: "b.mdx", content: mdx("CL-LSN-002-V01", "lecon-b", ["CL-LSN-001-V01"]) },
    ]);

    expect(Array.isArray(res)).toBe(true);
    if (!Array.isArray(res)) return;
    const b = res.find((r) => r.name === "b.mdx");
    expect(b?.result.valid).toBe(false);
    expect(
      b?.result.errors.some((e) => e.message.includes("fourni par un fichier du lot en erreur")),
    ).toBe(true);
    expect(b?.result.warnings.some((w) => w.includes("fourni par le lot"))).toBe(false);
  });

  it("flags intra-batch refCode duplicates on the duplicated files", async () => {
    const res = await validateImportBatchAction([
      { name: "a.mdx", content: mdx("CL-LSN-001-V01", "lecon-a") },
      { name: "b.mdx", content: mdx("CL-LSN-001-V01", "lecon-b") },
    ]);

    expect(Array.isArray(res)).toBe(true);
    if (!Array.isArray(res)) return;
    for (const item of res) {
      expect(item.result.valid).toBe(false);
      expect(item.result.errors.some((e) => e.message.includes("Doublon dans le lot"))).toBe(true);
    }
  });

  it("rejects an oversized batch with a readable message", async () => {
    const res = await validateImportBatchAction(
      Array.from({ length: 31 }, (_, i) => ({
        name: `f${String(i)}.mdx`,
        content: "---\n---\nx",
      })),
    );

    expect(Array.isArray(res)).toBe(false);
    if (Array.isArray(res)) return;
    expect(res.status).toBe("invalid_input");
  });
});

describe("importLessonBatchAction", () => {
  it("never creates a second lesson for a refCode the database got in the meantime", async () => {
    m.findByRefCode.mockResolvedValue({
      id: "lesson-1",
      refCode: "CL-LSN-001-V01",
      slug: "lecon-a",
      status: "DRAFT",
      updatedAt: new Date(),
      contentMdx: "# Avant",
      title: "Une lecon de test",
      description: "Une description suffisamment longue pour le schema de validation.",
      category: "DEV",
      difficulty: "BEGINNER",
      estimatedMinutes: 10,
      xpReward: 50,
      prerequisites: [],
    });

    const res = await importLessonBatchAction([
      { name: "a.mdx", content: mdx("CL-LSN-001-V01", "lecon-a") },
    ]);

    expect(res.status).toBe("done");
    if (res.status !== "done") return;
    expect(res.outcomes).toMatchObject([{ name: "a.mdx", status: "exists" }]);
    const [outcome] = res.outcomes;
    expect(outcome?.status === "exists" && outcome.result.update?.lessonId).toBe("lesson-1");
    expect(m.create).not.toHaveBeenCalled();
  });

  it("creates a new lesson in one write, which records its version and its audit row", async () => {
    const content = mdx("CL-LSN-001-V01", "lecon-a");
    const res = await importLessonBatchAction([{ name: "a.mdx", content }]);

    expect(res).toMatchObject({
      status: "done",
      outcomes: [{ name: "a.mdx", status: "success", lessonId: "id-CL-LSN-001-V01" }],
    });
    expect(m.create).toHaveBeenCalledExactlyOnceWith({
      fields: expect.objectContaining({ refCode: "CL-LSN-001-V01", slug: "lecon-a" }) as unknown,
      actorId: "admin-1",
      prerequisiteRefCodes: [],
      auditMetadata: {
        refCode: "CL-LSN-001-V01",
        contentHash: expect.stringMatching(/^[a-f0-9]{64}$/) as unknown,
      },
    });
    // The success row is the publish's own: none is written beside it.
    expect(m.auditRecord).not.toHaveBeenCalled();
  });

  it("counts updates in the hourly budget, with imports", async () => {
    m.importCount.mockResolvedValue(250);
    const before = Date.now();
    const res = await importLessonBatchAction([
      { name: "a.mdx", content: mdx("CL-LSN-001-V01", "lecon-a") },
    ]);
    const after = Date.now();
    expect(res).toEqual({ status: "rate_limited", remaining: 0 });
    // Over the last hour: which rows count is lessonFileRepository.countImportsSince's.
    const [actorId, since] = m.importCount.mock.calls[0] as [string, Date];
    expect(actorId).toBe("admin-1");
    expect(since.getTime()).toBeGreaterThanOrEqual(before - HOUR);
    expect(since.getTime()).toBeLessThanOrEqual(after - HOUR);
    expect(m.auditRecord).toHaveBeenCalledExactlyOnceWith({
      actorId: "admin-1",
      action: "lesson.import.rate_limited",
      targetType: "lesson",
      targetId: null,
      metadata: { requested: 1, remaining: 0 },
    });
  });
});

describe("updateLessonFromImportAction", () => {
  const input = { name: "a.mdx", content: mdx("CL-LSN-001-V01", "lecon-a"), hash: HASH };

  it("writes the file over its lesson, from the import, with the fingerprint seen", async () => {
    m.apply.mockResolvedValue({ ok: true, lessonId: "lesson-1", version: 3, draftKept: false });
    expect(await updateLessonFromImportAction(input)).toEqual({
      status: "success",
      lessonId: "lesson-1",
      version: 3,
      draftKept: false,
    });
    expect(m.apply).toHaveBeenCalledWith(input.content, HASH, "admin-1", {
      kind: "import",
      file: "a.mdx",
    });
  });

  it("says when the studio draft open on the lesson is kept", async () => {
    m.apply.mockResolvedValue({ ok: true, lessonId: "lesson-1", version: 3, draftKept: true });
    expect(await updateLessonFromImportAction(input)).toMatchObject({
      status: "success",
      draftKept: true,
    });
  });

  it("passes on a refusal with the file's problems", async () => {
    const errors = [{ field: "contentMdx", line: 14, message: "Ligne 14 : …" }];
    m.apply.mockResolvedValue({ ok: false, reason: "invalid", message: "Refusé.", errors });
    expect(await updateLessonFromImportAction(input)).toEqual({
      status: "refused",
      reason: "invalid",
      message: "Refusé.",
      errors,
    });
  });

  it("refuses a malformed request before anything else", async () => {
    const res = await updateLessonFromImportAction({ ...input, hash: "pas-une-empreinte" });
    expect(res.status).toBe("invalid_input");
    expect(m.apply).not.toHaveBeenCalled();
  });

  it("stops at the hourly budget, and logs that it did", async () => {
    m.importCount.mockResolvedValue(250);
    expect(await updateLessonFromImportAction(input)).toEqual({ status: "rate_limited" });
    expect(m.apply).not.toHaveBeenCalled();
    expect(m.auditRecord).toHaveBeenCalledExactlyOnceWith({
      actorId: "admin-1",
      action: "lesson.import.rate_limited",
      targetType: "lesson",
      targetId: null,
      metadata: { update: true },
    });
  });
});
