import { describe, expect, it } from "vitest";
import {
  checkPathManifests,
  loadPathManifests,
  manifestLessons,
} from "../../prisma/path-manifests";

function manifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    refCode: "CL-PATH-103-V01",
    slug: "reseaux",
    title: "Réseaux informatiques",
    description: "Concevoir, configurer et sécuriser un réseau.",
    category: "NETWORK",
    difficulty: "BEGINNER",
    estimatedHours: 70,
    modules: [
      { title: "Les bases", lessons: ["CL-LSN-03001-V01", "CL-LSN-03002-V01"] },
      { title: "L'adressage", lessons: ["CL-LSN-03003-V01"] },
    ],
    ...overrides,
  };
}

describe("content/paths manifests", () => {
  it("are all valid, as the repository holds them", () => {
    const { manifests, errors } = loadPathManifests();
    expect(errors).toEqual([]);
    expect(manifests.length).toBeGreaterThan(0);
  });
});

describe("checkPathManifests", () => {
  it("accepts a well-formed manifest and gives its lessons in study order", () => {
    const { manifests, errors } = checkPathManifests([{ file: "reseaux.json", json: manifest() }]);
    expect(errors).toEqual([]);
    const first = manifests[0];
    if (!first) throw new Error("no manifest");
    expect(manifestLessons(first.manifest)).toEqual([
      { refCode: "CL-LSN-03001-V01", moduleIndex: 0 },
      { refCode: "CL-LSN-03002-V01", moduleIndex: 0 },
      { refCode: "CL-LSN-03003-V01", moduleIndex: 1 },
    ]);
    expect(first.manifest.track).toBe("SKILL");
  });

  it("wants the file named after the slug", () => {
    const { errors } = checkPathManifests([{ file: "network.json", json: manifest() }]);
    expect(errors.join("\n")).toContain("reseaux.json");
  });

  it("refuses a lesson listed twice in a path", () => {
    const { errors } = checkPathManifests([
      {
        file: "reseaux.json",
        json: manifest({
          modules: [
            { title: "Un", lessons: ["CL-LSN-03001-V01"] },
            { title: "Deux", lessons: ["CL-LSN-03001-V01"] },
          ],
        }),
      },
    ]);
    expect(errors.join("\n")).toContain("apparaît deux fois");
  });

  it("refuses a lesson that belongs to two paths", () => {
    const { errors } = checkPathManifests([
      { file: "reseaux.json", json: manifest() },
      {
        file: "reseaux-bis.json",
        json: manifest({
          refCode: "CL-PATH-104-V01",
          slug: "reseaux-bis",
          modules: [{ title: "Copie", lessons: ["CL-LSN-03001-V01"] }],
        }),
      },
    ]);
    expect(errors.join("\n")).toContain("appartient déjà");
  });

  it("catches a lesson code that names another path", () => {
    const { errors } = checkPathManifests([
      {
        file: "reseaux.json",
        json: manifest({ modules: [{ title: "Bases", lessons: ["CL-LSN-02001-V01"] }] }),
      },
    ]);
    expect(errors.join("\n")).toContain("CL-LSN-03");
  });

  it("reports schema problems with where they are", () => {
    const { errors, manifests } = checkPathManifests([
      { file: "reseaux.json", json: manifest({ modules: [] }) },
    ]);
    expect(manifests).toEqual([]);
    expect(errors[0]).toMatch(/^reseaux\.json : modules/);
  });
});
