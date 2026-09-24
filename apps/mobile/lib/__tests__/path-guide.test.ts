import { describe, expect, it } from "vitest";
import { LEARNING_GOALS, suggestPaths } from "@cyberlearn/lib/paths/suggest";
import { suggestionsFor, toGuidePaths, toggleGoal, type RawGuidePath } from "../path-guide";

function raw(
  slug: string,
  category: RawGuidePath["category"],
  difficulty: RawGuidePath["difficulty"],
  refCode: string,
  lessons = 3,
): RawGuidePath {
  return {
    slug,
    title: slug,
    category,
    track: "SKILL",
    difficulty,
    estimatedHours: 4,
    refCode,
    avgRating: null,
    path_lessons: Array.from({ length: lessons }, (_, i) => ({ lessonId: `${slug}-${String(i)}` })),
  };
}

const ROWS: RawGuidePath[] = [
  raw("python-bases", "DEV", "BEGINNER", "CL-PATH-001", 12),
  raw("python-avance", "DEV", "ADVANCED", "CL-PATH-002"),
  raw("cyber-fondamentaux", "CYBERSEC", "BEGINNER", "CL-PATH-003"),
  raw("pentest-web", "CYBERSEC", "INTERMEDIATE", "CL-PATH-004"),
  raw("reseaux-tcp-ip", "NETWORK", "BEGINNER", "CL-PATH-005"),
];

describe("toGuidePaths", () => {
  it("counts a path's lessons from the embedded rows", () => {
    const [first] = toGuidePaths(ROWS);
    expect(first?.lessonCount).toBe(12);
    expect(first).not.toHaveProperty("path_lessons");
  });

  it("reads a path without lesson rows as empty", () => {
    const [p] = toGuidePaths([
      { ...raw("vide", "DEV", "BEGINNER", "CL-PATH-009"), path_lessons: null },
    ]);
    expect(p?.lessonCount).toBe(0);
  });
});

describe("suggestionsFor", () => {
  const paths = toGuidePaths(ROWS);

  it("suggests nothing until both questions are answered", () => {
    expect(suggestionsFor(paths, [], "NEW")).toEqual([]);
    expect(suggestionsFor(paths, ["DEV"], null)).toEqual([]);
  });

  it("suggests what the site suggests for the same answers", () => {
    const app = suggestionsFor(paths, ["DEV", "CYBERSEC"], "NEW").map((s) => s.path.slug);
    const site = suggestPaths(paths, { goals: ["DEV", "CYBERSEC"], level: "NEW" }).map(
      (s) => s.path.slug,
    );
    expect(app).toEqual(site);
    expect(app.slice(0, 2).sort()).toEqual(["cyber-fondamentaux", "python-bases"]);
  });

  it("gives every suggestion a reason", () => {
    for (const s of suggestionsFor(paths, ["UNSURE"], "NEW")) {
      expect(s.reason.length).toBeGreaterThan(20);
    }
  });
});

describe("toggleGoal", () => {
  it("ticks and unticks, in the order the choices are listed", () => {
    let goals = toggleGoal([], "NETWORK", LEARNING_GOALS);
    goals = toggleGoal(goals, "DEV", LEARNING_GOALS);
    expect(goals).toEqual(["DEV", "NETWORK"]);
    expect(toggleGoal(goals, "DEV", LEARNING_GOALS)).toEqual(["NETWORK"]);
  });
});
