import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => ({
  prisma: { lesson: { findFirst: m.findFirst, findMany: m.findMany } },
}));

import { validateMdxContent, orderBatchByPrerequisites } from "../lesson-import.service";

function mdx(refCode: string, prereqs: string[] = []): string {
  return `---
refCode: ${refCode}
slug: lecon-${refCode.slice(7, 10)}
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
  m.findFirst.mockResolvedValue(null); // no refCode/slug conflict in DB
  m.findMany.mockResolvedValue([]); // no prerequisite found in DB
});

describe("validateMdxContent - batch awareness", () => {
  it("errors on a prerequisite missing from the database (no batch)", async () => {
    const result = await validateMdxContent(mdx("CL-LSN-002-V01", ["CL-LSN-001-V01"]));

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("CL-LSN-001-V01"))).toBe(true);
  });

  it("downgrades to a warning when a sibling batch file provides the prerequisite", async () => {
    const result = await validateMdxContent(mdx("CL-LSN-002-V01", ["CL-LSN-001-V01"]), {
      peerRefCodes: ["CL-LSN-001-V01"],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes("fourni par le lot"))).toBe(true);
  });

  it("still errors when the prerequisite is neither in DB nor in the batch", async () => {
    const result = await validateMdxContent(mdx("CL-LSN-003-V01", ["CL-LSN-099-V01"]), {
      peerRefCodes: ["CL-LSN-001-V01"],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("CL-LSN-099-V01"))).toBe(true);
  });

  it("a prerequisite present in the database needs no batch help", async () => {
    m.findMany.mockResolvedValue([{ refCode: "CL-LSN-001-V01" }]);

    const result = await validateMdxContent(mdx("CL-LSN-002-V01", ["CL-LSN-001-V01"]));

    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("fourni par le lot"))).toBe(false);
  });
});

describe("orderBatchByPrerequisites", () => {
  it("orders dependents after their providers", () => {
    const { ordered, cyclic } = orderBatchByPrerequisites([
      { id: "c.mdx", refCode: "CL-LSN-003-V01", prerequisites: ["CL-LSN-002-V01"] },
      { id: "a.mdx", refCode: "CL-LSN-001-V01", prerequisites: [] },
      { id: "b.mdx", refCode: "CL-LSN-002-V01", prerequisites: ["CL-LSN-001-V01"] },
    ]);

    expect(cyclic).toHaveLength(0);
    expect(ordered.indexOf("a.mdx")).toBeLessThan(ordered.indexOf("b.mdx"));
    expect(ordered.indexOf("b.mdx")).toBeLessThan(ordered.indexOf("c.mdx"));
  });

  it("ignores prerequisites that no batch file provides (already in DB or missing)", () => {
    const { ordered, cyclic } = orderBatchByPrerequisites([
      { id: "a.mdx", refCode: "CL-LSN-010-V01", prerequisites: ["CL-LSN-001-V01"] },
      { id: "b.mdx", refCode: "CL-LSN-011-V01", prerequisites: [] },
    ]);

    expect(cyclic).toHaveLength(0);
    expect(ordered).toHaveLength(2);
  });

  it("reports a prerequisite cycle instead of ordering it", () => {
    const { ordered, cyclic } = orderBatchByPrerequisites([
      { id: "a.mdx", refCode: "CL-LSN-001-V01", prerequisites: ["CL-LSN-002-V01"] },
      { id: "b.mdx", refCode: "CL-LSN-002-V01", prerequisites: ["CL-LSN-001-V01"] },
      { id: "c.mdx", refCode: "CL-LSN-003-V01", prerequisites: [] },
    ]);

    expect(ordered).toEqual(["c.mdx"]);
    expect(cyclic.sort()).toEqual(["a.mdx", "b.mdx"]);
  });
});
