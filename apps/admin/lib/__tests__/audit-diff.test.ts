import { describe, expect, it } from "vitest";
import { changedFields } from "../audit-diff";

/**
 * Which fields an edit changed, as the audit log records them: by name, so the
 * log says a challenge's flag changed without ever holding the flag.
 */

const BEFORE = {
  title: "Le journal",
  flag: "CL{ancien}",
  xpReward: 100,
  machine: { title: "Serveur", files: { "a.txt": "{{FLAG}}" } },
  starterCode: null,
};

describe("changedFields", () => {
  it("names nothing when nothing moved", () => {
    expect(changedFields(BEFORE, { ...BEFORE })).toEqual([]);
  });

  it("names the fields that moved, and only those", () => {
    expect(changedFields(BEFORE, { ...BEFORE, title: "Le registre", xpReward: 150 })).toEqual([
      "title",
      "xpReward",
    ]);
  });

  it("says the flag changed without carrying either value", () => {
    const changed = changedFields(BEFORE, { ...BEFORE, flag: "CL{nouveau}" });
    expect(changed).toEqual(["flag"]);
    expect(JSON.stringify(changed)).not.toMatch(/ancien|nouveau/u);
  });

  it("sees a flag removed as a change", () => {
    expect(changedFields(BEFORE, { ...BEFORE, flag: null })).toEqual(["flag"]);
  });

  it("reads a reordered JSON object as the same object", () => {
    // Postgres hands jsonb back with its keys in its own order.
    const machine = { files: { "a.txt": "{{FLAG}}" }, title: "Serveur" };
    expect(changedFields(BEFORE, { ...BEFORE, machine })).toEqual([]);
  });

  it("compares only what the edit writes", () => {
    expect(changedFields(BEFORE, { title: "Le journal" })).toEqual([]);
  });
});
