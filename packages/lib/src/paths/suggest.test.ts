import { describe, expect, it } from "vitest";
import { suggestPaths, type LearningGoal, type StartingLevel } from "./suggest.js";

/**
 * Suggestions over the platform's real catalogue: the sixteen paths of
 * packages/db/prisma/seed-paths.ts, as they are published.
 */

const CATALOGUE = [
  ["python-bases-pratique", "DEV", "SKILL", "BEGINNER"],
  ["javascript-moderne", "DEV", "SKILL", "BEGINNER"],
  ["c-programmation", "DEV", "SKILL", "BEGINNER"],
  ["assembleur-x86", "DEV", "SKILL", "INTERMEDIATE"],
  ["linux-terminal", "DEV", "SKILL", "BEGINNER"],
  ["git-docker-cicd", "DEV", "SKILL", "INTERMEDIATE"],
  ["cyber-fondamentaux", "CYBERSEC", "SKILL", "BEGINNER"],
  ["cyber-web-owasp", "CYBERSEC", "SKILL", "INTERMEDIATE"],
  ["cryptographie", "CYBERSEC", "SKILL", "INTERMEDIATE"],
  ["pentest", "CYBERSEC", "CAREER", "ADVANCED"],
  ["grc", "CYBERSEC", "CAREER", "INTERMEDIATE"],
  ["blue-team-soc", "CYBERSEC", "CAREER", "INTERMEDIATE"],
  ["osint", "CYBERSEC", "CAREER", "INTERMEDIATE"],
  ["reseaux-tcp-ip", "NETWORK", "SKILL", "INTERMEDIATE"],
  ["cloud", "NETWORK", "SKILL", "INTERMEDIATE"],
  ["admin-systeme-linux", "DEV", "CAREER", "INTERMEDIATE"],
].map(([slug, category, track, difficulty], i) => ({
  slug: slug ?? "",
  title: slug ?? "",
  category: category ?? "",
  track: track ?? "",
  difficulty: difficulty ?? "",
  lessonCount: 12,
  refCode: `CL-PATH-${String(i + 1).padStart(3, "0")}-V01`,
}));

function slugs(goals: LearningGoal[], level: StartingLevel): string[] {
  return suggestPaths(CATALOGUE, { goals, level }).map((s) => s.path.slug);
}

describe("suggestPaths", () => {
  it("starts a complete beginner in code at the curriculum's first path", () => {
    expect(slugs(["DEV"], "NEW")[0]).toBe("python-bases-pratique");
  });

  it("starts networking at the network path, before the cloud one", () => {
    expect(slugs(["NETWORK"], "NEW")).toEqual(["reseaux-tcp-ip", "cloud"]);
  });

  it("lets the learners' ratings decide between paths that fit equally", () => {
    const rated = CATALOGUE.map((p) => (p.slug === "cloud" ? { ...p, avgRating: 4.8 } : p));
    expect(
      suggestPaths(rated, { goals: ["NETWORK"], level: "NEW" }).map((s) => s.path.slug),
    ).toEqual(["cloud", "reseaux-tcp-ip"]);
  });

  it("starts a complete beginner in cybersecurity at the fundamentals", () => {
    expect(slugs(["CYBERSEC"], "NEW")[0]).toBe("cyber-fondamentaux");
  });

  it("never sends a complete beginner to an advanced path", () => {
    for (const goals of [["CYBERSEC"], ["CYBERSEC", "CAREER"], ["UNSURE"]] as LearningGoal[][]) {
      expect(slugs(goals, "NEW")).not.toContain("pentest");
    }
  });

  it("leaves the last slot empty rather than fill it with an advanced path for a beginner", () => {
    const small = CATALOGUE.filter((p) => ["cyber-fondamentaux", "pentest"].includes(p.slug));
    expect(
      suggestPaths(small, { goals: ["CYBERSEC"], level: "NEW" }).map((s) => s.path.slug),
    ).toEqual(["cyber-fondamentaux"]);
  });

  it("uses the article French wants for each domain", () => {
    const pentest = suggestPaths(CATALOGUE, {
      goals: ["CYBERSEC", "CAREER"],
      level: "PRACTICING",
    }).find((s) => s.path.slug === "pentest");
    expect(pentest?.reason).toContain("Pour qui pratique déjà la cybersécurité.");
  });

  it("shows every domain that was ticked before a second path in any", () => {
    const picked = suggestPaths(CATALOGUE, { goals: ["DEV", "CYBERSEC"], level: "NEW" });
    expect(new Set(picked.slice(0, 2).map((s) => s.path.category))).toEqual(
      new Set(["DEV", "CYBERSEC"]),
    );
  });

  it("gives one entry point per domain to somebody who does not know yet", () => {
    const picked = suggestPaths(CATALOGUE, { goals: ["UNSURE"], level: "NEW" });
    expect(picked.map((s) => s.path.category).sort()).toEqual(["CYBERSEC", "DEV", "NETWORK"]);
  });

  it("leans to the job paths when a job is the goal", () => {
    const picked = suggestPaths(CATALOGUE, { goals: ["CYBERSEC", "CAREER"], level: "SOME" });
    expect(picked[0]?.path.track).toBe("CAREER");
  });

  it("moves past the beginner paths for somebody who already practises", () => {
    expect(slugs(["DEV"], "PRACTICING")[0]).not.toMatch(
      /python|javascript|c-programmation|linux-terminal/,
    );
  });

  it("says why, in French, for each", () => {
    const [first] = suggestPaths(CATALOGUE, { goals: ["CYBERSEC"], level: "NEW" });
    expect(first?.reason).toBe(
      "Sans prérequis : le point de départ en cybersécurité. 12 missions sur une compétence précise.",
    );
  });

  it("warns a beginner when the most accessible path of a domain still needs some ease", () => {
    // There is no beginner network path: the suggestion says what it assumes.
    const [first] = suggestPaths(CATALOGUE, { goals: ["NETWORK"], level: "NEW" });
    expect(first?.reason).toContain("L'entrée la plus accessible en réseaux et systèmes");
  });

  it("is limited, and empty when nothing is published", () => {
    expect(suggestPaths(CATALOGUE, { goals: ["DEV"], level: "SOME" }, 2)).toHaveLength(2);
    expect(suggestPaths([], { goals: ["DEV"], level: "NEW" })).toEqual([]);
  });
});
