import { describe, expect, it } from "vitest";
import { FALLBACK_MODULE_SIZE, groupIntoModules, moduleLabel } from "./modules";

const lesson = (moduleId: string | null): { moduleId: string | null } => ({ moduleId });

describe("groupIntoModules", () => {
  it("cuts a path without modules into untitled blocks of six", () => {
    const groups = groupIntoModules(
      Array.from({ length: 14 }, () => lesson(null)),
      [],
    );
    expect(groups.map((g) => g.indices.length)).toEqual([FALLBACK_MODULE_SIZE, 6, 2]);
    expect(groups.every((g) => g.title === null)).toBe(true);
    expect(groups[2]?.indices).toEqual([12, 13]);
  });

  it("follows the path's modules, in module order, with their titles", () => {
    const modules = [
      { id: "m2", position: 2, title: "Le routage" },
      { id: "m1", position: 1, title: "L'adressage", description: "IPv4" },
    ];
    const groups = groupIntoModules(
      [lesson("m1"), lesson("m1"), lesson("m2"), lesson("m2"), lesson("m2")],
      modules,
    );
    expect(groups.map((g) => [g.title, g.indices])).toEqual([
      ["L'adressage", [0, 1]],
      ["Le routage", [2, 3, 4]],
    ]);
    expect(groups[0]?.description).toBe("IPv4");
    expect(groups.map((g) => g.number)).toEqual([1, 2]);
  });

  it("keeps a lesson with no known module in a last group instead of losing it", () => {
    const groups = groupIntoModules(
      [lesson("m1"), lesson(null), lesson("elsewhere")],
      [{ id: "m1", position: 1, title: "Bases" }],
    );
    expect(groups.map((g) => [g.title, g.indices])).toEqual([
      ["Bases", [0]],
      [null, [1, 2]],
    ]);
  });

  it("numbers only the modules that have lessons", () => {
    const groups = groupIntoModules(
      [lesson("m2")],
      [
        { id: "m1", position: 1, title: "Vide" },
        { id: "m2", position: 2, title: "Plein" },
      ],
    );
    expect(groups).toHaveLength(1);
    expect(moduleLabel(groups[0] ?? { number: 0 })).toBe("Module 01");
  });

  it("gives an empty path no groups", () => {
    expect(groupIntoModules([], [])).toEqual([]);
  });
});
