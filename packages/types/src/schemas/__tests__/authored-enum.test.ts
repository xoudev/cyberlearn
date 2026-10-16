/**
 * The shared locale words an enum's error for a form and never lists the
 * values. A file written by hand has no options on screen, so its enums name
 * the values themselves, and keep doing so once the locale is set, as every
 * app sets it.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { configureZodLocale } from "../../zod-locale.js";
import { authoredEnum } from "../authored-enum.js";
import { parseChallengeFile } from "../challenge-file.schema.js";
import { importLessonMetadataSchema } from "../import.schema.js";
import { pathManifestSchema } from "../path-manifest.schema.js";

beforeAll(() => {
  configureZodLocale();
});

function messages(result: {
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}): Record<string, string> {
  return Object.fromEntries(
    (result.error?.issues ?? []).map((issue) => [issue.path.join("."), issue.message]),
  );
}

describe("authoredEnum", () => {
  it("names the accepted values, joined the French way", () => {
    expect(authoredEnum(["A"]).safeParse("B").error?.issues[0]?.message).toBe(
      "Valeur attendue : A.",
    );
    expect(authoredEnum(["A", "B"]).safeParse("C").error?.issues[0]?.message).toBe(
      "Valeur attendue : A ou B.",
    );
    expect(authoredEnum(["A", "B", "C"]).safeParse("D").error?.issues[0]?.message).toBe(
      "Valeur attendue : A, B ou C.",
    );
  });

  it("reads the values it names", () => {
    expect(authoredEnum(["DEV", "NETWORK"]).safeParse("NETWORK").data).toBe("NETWORK");
  });
});

describe("files written by hand", () => {
  it("a lesson's frontmatter names its categories and difficulties", () => {
    const found = messages(
      importLessonMetadataSchema.safeParse({ category: "SECURITY", difficulty: "HARD" }),
    );
    expect(found.category).toBe("Valeur attendue : DEV, CYBERSEC ou NETWORK.");
    expect(found.difficulty).toBe("Valeur attendue : BEGINNER, INTERMEDIATE, ADVANCED ou EXPERT.");
  });

  it("a path manifest names its categories, tracks and difficulties", () => {
    const found = messages(
      pathManifestSchema.safeParse({ category: "SECURITY", track: "JOB", difficulty: "HARD" }),
    );
    expect(found.category).toBe("Valeur attendue : DEV, CYBERSEC ou NETWORK.");
    expect(found.track).toBe("Valeur attendue : SKILL ou CAREER.");
    expect(found.difficulty).toBe("Valeur attendue : BEGINNER, INTERMEDIATE, ADVANCED ou EXPERT.");
  });

  it("a challenge file names its categories, and the shape of a prerequisite", () => {
    // It reports its first problem only, so everything else is in order.
    const challenge = (over: Record<string, unknown>): Record<string, unknown> => ({
      refCode: "CL-CHG-002",
      slug: "deux",
      title: "Deux",
      description: "Le second défi.",
      instructions: "Trouve le flag.",
      category: "CYBERSEC",
      difficulty: "BEGINNER",
      xpReward: 50,
      maxAttempts: 10,
      orderIndex: 2,
      machine: { files: { "flag.txt": "{{FLAG}}" } },
      ...over,
    });
    expect(parseChallengeFile(challenge({})).ok).toBe(true);
    expect(parseChallengeFile(challenge({ category: "SECURITY" }))).toEqual({
      ok: false,
      problem: "category : Valeur attendue : CYBERSEC, DEV ou NETWORK.",
    });
    expect(parseChallengeFile(challenge({ prerequisite: "CHG-1" }))).toEqual({
      ok: false,
      problem: "prerequisite : refCode au format CL-CHG-001",
    });
  });
});
