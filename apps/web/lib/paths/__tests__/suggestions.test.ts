import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const prefsFindUnique = vi.fn();
const upsert = vi.fn();
vi.mock("@cyberlearn/db", () => ({
  prisma: {
    path: { findMany },
    userPreferences: { findUnique: prefsFindUnique, upsert },
  },
}));

const {
  guideQuery,
  parseLearningAnswers,
  readGuideQuery,
  saveLearningAnswers,
  savedLearningAnswers,
  suggestionsFor,
} = await import("../suggestions");

/** A query string as Next hands it to a page: repeated keys become arrays. */
function params(query: string): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of new URLSearchParams(query)) {
    const prev = out[key];
    out[key] = prev === undefined ? value : Array.isArray(prev) ? [...prev, value] : [prev, value];
  }
  return out;
}

beforeEach(() => {
  findMany.mockReset();
  prefsFindUnique.mockReset();
  upsert.mockReset();
});

describe("parseLearningAnswers", () => {
  it("reads one goal or several", () => {
    expect(parseLearningAnswers({ goals: "DEV", level: "NEW" })).toEqual({
      goals: ["DEV"],
      level: "NEW",
    });
    expect(parseLearningAnswers({ goals: ["DEV", "CYBERSEC", "DEV"], level: "SOME" })).toEqual({
      goals: ["DEV", "CYBERSEC"],
      level: "SOME",
    });
  });

  it("is null until both questions are answered with known values", () => {
    expect(parseLearningAnswers({ goals: undefined, level: "NEW" })).toBeNull();
    expect(parseLearningAnswers({ goals: ["DEV"], level: undefined })).toBeNull();
    expect(parseLearningAnswers({ goals: ["HACKING"], level: "NEW" })).toBeNull();
    expect(parseLearningAnswers({ goals: ["DEV"], level: "EXPERT" })).toBeNull();
  });
});

describe("readGuideQuery", () => {
  it("shows the questions, earlier answers ticked, when nothing was sent", () => {
    const saved = { goals: ["NETWORK" as const], level: "SOME" as const };
    expect(readGuideQuery({}, saved)).toEqual({ answers: null, draft: saved, error: null });
  });

  it("suggests once both questions are answered", () => {
    const view = readGuideQuery(params("goals=DEV&goals=CAREER&level=PRACTICING"));
    expect(view.answers).toEqual({ goals: ["DEV", "CAREER"], level: "PRACTICING" });
    expect(view.error).toBeNull();
  });

  it("asks for a goal when only the level was sent", () => {
    const view = readGuideQuery(params("level=NEW"));
    expect(view.answers).toBeNull();
    expect(view.error).toBe("Coche au moins une réponse à la première question.");
    expect(view.draft).toEqual({ goals: [], level: "NEW" });
  });

  it("asks for a level when only goals were sent", () => {
    const view = readGuideQuery(params("goals=DEV"));
    expect(view.answers).toBeNull();
    expect(view.error).toBe("Choisis ton point de départ, à la deuxième question.");
  });

  it("drops values it does not know rather than failing on them", () => {
    const view = readGuideQuery(params("goals=HACKING&goals=DEV&level=NEW"));
    expect(view.answers).toEqual({ goals: ["DEV"], level: "NEW" });
  });

  it("shows the form again, ticked, when asked to edit", () => {
    const view = readGuideQuery(params("goals=DEV&level=NEW&edit=1"));
    expect(view.answers).toBeNull();
    expect(view.error).toBeNull();
    expect(view.draft).toEqual({ goals: ["DEV"], level: "NEW" });
  });
});

describe("guideQuery", () => {
  const answers = { goals: ["DEV" as const, "NETWORK" as const], level: "SOME" as const };

  it("round-trips through readGuideQuery", () => {
    expect(readGuideQuery(params(guideQuery(answers))).answers).toEqual(answers);
  });

  it("marks an edit", () => {
    expect(guideQuery(answers, true)).toBe("goals=DEV&goals=NETWORK&level=SOME&edit=1");
  });
});

describe("suggestionsFor", () => {
  const row = (slug: string, category: string, difficulty: string, refCode: string) => ({
    slug,
    title: slug,
    description: "",
    category,
    track: "SKILL",
    difficulty,
    estimatedHours: 5,
    refCode,
    avgRating: null,
    _count: { lessons: 9 },
  });

  it("reads the published catalogue only, never a class's paths", async () => {
    findMany.mockResolvedValue([]);
    await suggestionsFor({ goals: ["DEV"], level: "NEW" });
    const [args] = findMany.mock.calls[0] as [{ where: unknown }];
    expect(args.where).toEqual({ status: "PUBLISHED", audience: "CATALOGUE" });
  });

  it("suggests from those paths, with the lesson count in the reason", async () => {
    findMany.mockResolvedValue([
      row("python-bases", "DEV", "BEGINNER", "CL-PATH-001"),
      row("python-avance", "DEV", "ADVANCED", "CL-PATH-002"),
      row("cyber-bases", "CYBERSEC", "BEGINNER", "CL-PATH-003"),
    ]);
    const suggestions = await suggestionsFor({ goals: ["DEV"], level: "NEW" });
    expect(suggestions[0]?.path.slug).toBe("python-bases");
    expect(suggestions[0]?.path.lessonCount).toBe(9);
    expect(suggestions[0]?.reason).toContain("9 missions");
    expect(suggestions.map((s) => s.path.slug)).not.toContain("cyber-bases");
  });
});

describe("saving and reading the answers", () => {
  it("upserts them on the user's preferences", async () => {
    await saveLearningAnswers("user-1", { goals: ["CYBERSEC"], level: "NEW" });
    expect(upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: { userId: "user-1", learningGoals: ["CYBERSEC"], startingLevel: "NEW" },
      update: { learningGoals: ["CYBERSEC"], startingLevel: "NEW" },
    });
  });

  it("reads nothing for somebody who never answered", async () => {
    prefsFindUnique.mockResolvedValue(null);
    expect(await savedLearningAnswers("user-1")).toEqual({});
  });

  it("drops stored values the questionnaire no longer offers", async () => {
    prefsFindUnique.mockResolvedValue({ learningGoals: ["DEV", "RETIRED"], startingLevel: "OLD" });
    expect(await savedLearningAnswers("user-1")).toEqual({ goals: ["DEV"] });
  });
});
