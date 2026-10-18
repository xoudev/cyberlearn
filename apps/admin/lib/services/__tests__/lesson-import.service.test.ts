import { configureZodLocale } from "@cyberlearn/types/zod-locale";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  findByRefCode: vi.fn(),
  findIdBySlug: vi.fn(),
  findMany: vi.fn(),
  answers: vi.fn(),
  edits: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => ({
  prisma: {},
  lessonFileRepository: {
    findByRefCode: m.findByRefCode,
    findIdBySlug: m.findIdBySlug,
    findByRefCodesForLinks: m.findMany,
    quizAnswerCounts: m.answers,
    consoleEditsSinceFile: m.edits,
  },
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
  m.findByRefCode.mockResolvedValue(null); // a new lesson
  m.findIdBySlug.mockResolvedValue(null); // its slug is free
  m.findMany.mockResolvedValue([]); // no prerequisite found in DB
  m.answers.mockResolvedValue([]);
  m.edits.mockResolvedValue(new Map());
});

/** The row the database holds for mdx(refCode), with a body of its own. */
function lessonRow(refCode: string, body: string, over: Record<string, unknown> = {}) {
  return {
    id: "lesson-1",
    refCode,
    slug: `lecon-${refCode.slice(7, 10)}`,
    status: "PUBLISHED",
    updatedAt: new Date("2026-09-01T10:00:00Z"),
    contentMdx: body,
    title: "Une lecon de test",
    description: "Une description suffisamment longue pour le schema de validation.",
    category: "DEV",
    difficulty: "BEGINNER",
    estimatedMinutes: 10,
    xpReward: 50,
    prerequisites: [] as { prerequisite: { refCode: string } }[],
    ...over,
  };
}

describe("validateMdxContent - a refCode already in the database", () => {
  const body = "# Introduction\n\nUn contenu de test parfaitement ordinaire en Markdown.";

  it("is an update to show, not a refusal: fields and passages that change", async () => {
    m.findByRefCode.mockResolvedValue(
      lessonRow("CL-LSN-002-V01", body.replace("ordinaire", "banal"), { xpReward: 30 }),
    );
    m.findIdBySlug.mockResolvedValue("lesson-1");

    const result = await validateMdxContent(mdx("CL-LSN-002-V01"));

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.update).toMatchObject({
      lessonId: "lesson-1",
      refCode: "CL-LSN-002-V01",
      status: "PUBLISHED",
      fields: [{ field: "xpReward", label: "XP", before: "30", after: "50" }],
      added: 1,
      removed: 1,
      slugDiffers: null,
      editedInConsoleAt: null,
    });
    expect(result.update?.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(
      result.update?.hunks[0]?.lines.some(
        (l) => l.kind === "added" && l.text.includes("ordinaire"),
      ),
    ).toBe(true);
  });

  it("says when the file is the lesson already, word for word", async () => {
    m.findByRefCode.mockResolvedValue(lessonRow("CL-LSN-002-V01", body));
    const result = await validateMdxContent(mdx("CL-LSN-002-V01"));
    expect(result.update).toMatchObject({ fields: [], hunks: [], added: 0, removed: 0 });
  });

  it("keeps the lesson's slug: another lesson's slug in the file is pointed out, not refused", async () => {
    m.findByRefCode.mockResolvedValue(lessonRow("CL-LSN-002-V01", body, { slug: "ancien-slug" }));
    m.findIdBySlug.mockResolvedValue("lesson-9");
    const result = await validateMdxContent(mdx("CL-LSN-002-V01"));
    expect(result.valid).toBe(true);
    expect(result.update?.slugDiffers).toEqual({ database: "ancien-slug", file: "lecon-002" });
  });

  it("warns about edits made in the console since the lesson last came from a file", async () => {
    const edited = new Date("2026-09-10T08:00:00Z");
    m.findByRefCode.mockResolvedValue(lessonRow("CL-LSN-002-V01", body));
    m.edits.mockResolvedValue(new Map([["lesson-1", edited]]));
    const result = await validateMdxContent(mdx("CL-LSN-002-V01"));
    expect(result.update?.editedInConsoleAt).toEqual(edited);
  });

  it("still refuses a new lesson whose slug another lesson has", async () => {
    m.findIdBySlug.mockResolvedValue("lesson-9");
    const result = await validateMdxContent(mdx("CL-LSN-002-V01"));
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.field)).toEqual(["slug"]);
    expect(result.update).toBeUndefined();
  });
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

describe("validateMdxContent - frontmatter errors", () => {
  it("names the accepted values of a category or difficulty it does not know", async () => {
    // As the console's instrumentation sets it: the locale words an enum for a
    // form, without its values, and a file has no options on screen.
    configureZodLocale();
    const result = await validateMdxContent(
      mdx("CL-LSN-002-V01")
        .replace("category: DEV", "category: SECURITY")
        .replace("difficulty: BEGINNER", "difficulty: HARD"),
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      {
        field: "category",
        line: 6,
        message: "Frontmatter, ligne 6 (category) : Valeur attendue : DEV, CYBERSEC ou NETWORK.",
      },
      {
        field: "difficulty",
        line: 7,
        message:
          "Frontmatter, ligne 7 (difficulty) : Valeur attendue : BEGINNER, INTERMEDIATE, ADVANCED ou EXPERT.",
      },
    ]);
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
