import { describe, expect, it } from "vitest";
import { filterPaths, type PathFilters } from "@/lib/paths/filter-paths";

const CATALOGUE = [
  {
    title: "Python : des bases à la pratique",
    description: "Apprenez Python de zéro",
    category: "DEV",
    track: "SKILL",
  },
  {
    title: "Git, Docker et CI/CD",
    description: "Les outils du développeur moderne",
    category: "DEV",
    track: "SKILL",
  },
  {
    title: "Test d'intrusion",
    description: "Le métier de testeur d'intrusion",
    category: "CYBERSEC",
    track: "CAREER",
  },
  {
    title: "Blue team et SOC",
    description: "Le métier de la défense au quotidien",
    category: "CYBERSEC",
    track: "CAREER",
  },
  {
    title: "Réseaux : de la trame au web",
    description: "Comment circulent les données",
    category: "NETWORK",
    track: "SKILL",
  },
];

const NO_FILTER: PathFilters = { domain: "all", track: "all", search: "" };
const titles = (paths: { title: string }[]): string[] => paths.map((p) => p.title);

describe("filterPaths", () => {
  it("returns everything when nothing is selected", () => {
    expect(filterPaths(CATALOGUE, NO_FILTER)).toHaveLength(5);
  });

  it("narrows to a single track", () => {
    expect(titles(filterPaths(CATALOGUE, { ...NO_FILTER, track: "CAREER" }))).toEqual([
      "Test d'intrusion",
      "Blue team et SOC",
    ]);
    expect(filterPaths(CATALOGUE, { ...NO_FILTER, track: "SKILL" })).toHaveLength(3);
  });

  it("combines domain and track, since they answer different questions", () => {
    // "I want a job in security" is not the same list as "I want to learn a
    // security topic", and neither is the same as all of DEV.
    expect(
      titles(filterPaths(CATALOGUE, { ...NO_FILTER, domain: "CYBERSEC", track: "CAREER" })),
    ).toEqual(["Test d'intrusion", "Blue team et SOC"]);
    expect(filterPaths(CATALOGUE, { ...NO_FILTER, domain: "DEV", track: "CAREER" })).toEqual([]);
    expect(filterPaths(CATALOGUE, { ...NO_FILTER, domain: "DEV", track: "SKILL" })).toHaveLength(2);
  });

  it("searches title and description, and stays combinable with the pills", () => {
    expect(titles(filterPaths(CATALOGUE, { ...NO_FILTER, search: "docker" }))).toEqual([
      "Git, Docker et CI/CD",
    ]);
    // The word "métier" only appears in the descriptions of the CAREER paths.
    expect(filterPaths(CATALOGUE, { ...NO_FILTER, search: "métier" })).toHaveLength(2);
    expect(filterPaths(CATALOGUE, { ...NO_FILTER, search: "métier", domain: "NETWORK" })).toEqual(
      [],
    );
  });

  it("ignores surrounding whitespace and case in the search", () => {
    expect(filterPaths(CATALOGUE, { ...NO_FILTER, search: "   PYTHON  " })).toHaveLength(1);
  });
});
