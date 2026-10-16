import { describe, expect, it } from "vitest";
import {
  GOAL_WEIGHT,
  featuredScore,
  preferredDifficulty,
  rankFeaturedPaths,
  type FeaturedCandidate,
  type FeaturedContext,
} from "../featured-paths";

function path(overrides: Partial<FeaturedCandidate> & { id: string }): FeaturedCandidate {
  return {
    title: overrides.id,
    category: "NETWORK",
    difficulty: "BEGINNER",
    status: null,
    ...overrides,
  };
}

const NEWCOMER: FeaturedContext = { level: 1, placement: null, recentCategories: [], goals: [] };

describe("preferredDifficulty", () => {
  it("climbs with the level, at the site's thresholds", () => {
    expect(preferredDifficulty(1)).toBe("BEGINNER");
    expect(preferredDifficulty(5)).toBe("BEGINNER");
    expect(preferredDifficulty(6)).toBe("INTERMEDIATE");
    expect(preferredDifficulty(12)).toBe("INTERMEDIATE");
    expect(preferredDifficulty(13)).toBe("ADVANCED");
    expect(preferredDifficulty(21)).toBe("EXPERT");
  });
});

describe("featuredScore", () => {
  it("adds up the site's four signals", () => {
    const context: FeaturedContext = {
      level: 8,
      placement: { DEV: 20, CYBERSEC: 80, NETWORK: 40 },
      recentCategories: ["CYBERSEC", "CYBERSEC", "DEV"],
      goals: [],
    };
    // In progress 50 + level match 15 + placement 80% of 25 + two recent lessons x3.
    expect(
      featuredScore(
        path({ id: "p", category: "CYBERSEC", difficulty: "INTERMEDIATE", status: "IN_PROGRESS" }),
        context,
      ),
    ).toBe(50 + 15 + 20 + 6);
  });

  it("weighs a domain named at sign-up, and nothing for a goal that names none", () => {
    const network = path({ id: "p", difficulty: "EXPERT" });
    expect(featuredScore(network, { ...NEWCOMER, goals: ["NETWORK"] })).toBe(12.5 + GOAL_WEIGHT);
    expect(featuredScore(network, { ...NEWCOMER, goals: ["DEV", "CYBERSEC"] })).toBe(12.5);
    expect(featuredScore(network, { ...NEWCOMER, goals: ["CAREER", "UNSURE"] })).toBe(12.5);
  });

  it("counts an absent placement as middling, and caps the momentum", () => {
    expect(featuredScore(path({ id: "p", difficulty: "EXPERT" }), NEWCOMER)).toBe(12.5);
    const busy: FeaturedContext = { ...NEWCOMER, recentCategories: Array(10).fill("NETWORK") };
    expect(featuredScore(path({ id: "p", difficulty: "EXPERT" }), busy)).toBe(12.5 + 15);
  });
});

describe("rankFeaturedPaths", () => {
  it("never suggests a finished path", () => {
    const done = path({ id: "done", status: "COMPLETED" });
    expect(rankFeaturedPaths([done], NEWCOMER)).toEqual([]);
  });

  it("leads with the path in progress, then the best suited", () => {
    const ranked = rankFeaturedPaths(
      [
        path({ id: "expert", difficulty: "EXPERT" }),
        path({ id: "beginner" }),
        path({ id: "started", difficulty: "EXPERT", status: "IN_PROGRESS" }),
      ],
      NEWCOMER,
    );
    expect(ranked.map((p) => p.id)).toEqual(["started", "beginner"]);
  });

  // The first mission of somebody who answered "réseau" and then opened the
  // catalogue: the beginner paths all tie on everything else.
  it("leads with the domain the reader came for rather than the first title", () => {
    const paths = [
      path({ id: "dev", title: "Algorithmique", category: "DEV" }),
      path({ id: "cyber", title: "Bases de la cybersécurité", category: "CYBERSEC" }),
      path({ id: "net", title: "Réseaux : les fondamentaux", category: "NETWORK" }),
    ];
    expect(rankFeaturedPaths(paths, NEWCOMER)[0]?.id).toBe("dev");
    expect(rankFeaturedPaths(paths, { ...NEWCOMER, goals: ["NETWORK"] })[0]?.id).toBe("net");
  });

  it("still leads with a path in progress over a domain named at sign-up", () => {
    const ranked = rankFeaturedPaths(
      [
        path({ id: "net", category: "NETWORK" }),
        path({ id: "dev", category: "DEV", status: "IN_PROGRESS" }),
      ],
      { ...NEWCOMER, goals: ["NETWORK"] },
    );
    expect(ranked.map((p) => p.id)).toEqual(["dev", "net"]);
  });

  it("breaks a tie by title, whatever order the rows came in", () => {
    const a = path({ id: "2", title: "Bases du réseau" });
    const b = path({ id: "1", title: "Adressage IP" });
    expect(rankFeaturedPaths([a, b], NEWCOMER).map((p) => p.title)).toEqual([
      "Adressage IP",
      "Bases du réseau",
    ]);
    expect(rankFeaturedPaths([b, a], NEWCOMER).map((p) => p.title)).toEqual([
      "Adressage IP",
      "Bases du réseau",
    ]);
  });

  it("returns at most the limit", () => {
    const many = ["a", "b", "c", "d"].map((id) => path({ id }));
    expect(rankFeaturedPaths(many, NEWCOMER)).toHaveLength(2);
    expect(rankFeaturedPaths(many, NEWCOMER, 3)).toHaveLength(3);
  });
});
