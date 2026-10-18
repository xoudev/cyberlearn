import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as LessonUpdate from "@/lib/services/lesson-update.service";

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn(),
  findByRefCode: vi.fn(),
  findIdBySlug: vi.fn(),
  findMany: vi.fn(),
  answers: vi.fn(),
  edits: vi.fn(),
  auditCount: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
  apply: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  prisma: {
    auditLog: { count: m.auditCount, create: m.auditCreate },
    $transaction: m.transaction,
  },
  lessonFileRepository: {
    findByRefCode: m.findByRefCode,
    findIdBySlug: m.findIdBySlug,
    findByRefCodesForLinks: m.findMany,
    quizAnswerCounts: m.answers,
    consoleEditsSinceFile: m.edits,
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

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: "admin-1" });
  m.findByRefCode.mockResolvedValue(null);
  m.findIdBySlug.mockResolvedValue(null);
  m.findMany.mockResolvedValue([]);
  m.answers.mockResolvedValue([]);
  m.edits.mockResolvedValue(new Map());
  m.auditCount.mockResolvedValue(0);
  m.auditCreate.mockResolvedValue({});
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
    expect(m.transaction).not.toHaveBeenCalled();
  });

  it("counts updates in the hourly budget, with imports", async () => {
    m.auditCount.mockResolvedValue(250);
    const res = await importLessonBatchAction([
      { name: "a.mdx", content: mdx("CL-LSN-001-V01", "lecon-a") },
    ]);
    expect(res).toEqual({ status: "rate_limited", remaining: 0 });
    expect(m.auditCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        actorId: "admin-1",
        action: { in: ["lesson.import.success", "lesson.import.update"] },
      }) as unknown,
    });
  });
});

describe("updateLessonFromImportAction", () => {
  const input = { name: "a.mdx", content: mdx("CL-LSN-001-V01", "lecon-a"), hash: HASH };

  it("writes the file over its lesson, from the import, with the fingerprint seen", async () => {
    m.apply.mockResolvedValue({ ok: true, lessonId: "lesson-1" });
    expect(await updateLessonFromImportAction(input)).toEqual({
      status: "success",
      lessonId: "lesson-1",
    });
    expect(m.apply).toHaveBeenCalledWith(input.content, HASH, "admin-1", {
      kind: "import",
      file: "a.mdx",
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
    m.auditCount.mockResolvedValue(250);
    expect(await updateLessonFromImportAction(input)).toEqual({ status: "rate_limited" });
    expect(m.apply).not.toHaveBeenCalled();
    expect(m.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "lesson.import.rate_limited",
        actorId: "admin-1",
      }) as unknown,
    });
  });
});
