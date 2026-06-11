import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  auditCount: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  prisma: {
    lesson: { findFirst: m.findFirst, findMany: m.findMany },
    auditLog: { count: m.auditCount, create: m.auditCreate },
  },
}));

import { validateImportBatchAction } from "../actions";

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

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: "admin-1" });
  m.findFirst.mockResolvedValue(null);
  m.findMany.mockResolvedValue([]);
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
