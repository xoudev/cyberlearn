/**
 * The release notes, as data.
 *
 * Nothing here checks the prose - that is the point of writing it by hand.
 * What it checks is the handful of facts the page and the sidebar dot depend
 * on, all of which are easy to break while adding an entry and none of which
 * fail loudly: an entry appended at the bottom, a version reused, a date going
 * backwards, or the "new" dot left pointing at the previous release.
 */

import { describe, expect, it } from "vitest";
import { CHANGE_META, CHANGELOG, LATEST_VERSION } from "../entries";

describe("the changelog", () => {
  it("puts the newest entry first, which is what the page and the dot read", () => {
    const dates = CHANGELOG.map((entry) => entry.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("numbers the versions in the same order as the dates", () => {
    // Not covered by the two checks around it, and it is the mistake that
    // actually happened: the top two entries swapped numbers while staying
    // unique and while LATEST_VERSION still read the first one. Nothing was
    // wrong except the two numbers a reader sees.
    const rank = (version: string): number[] => version.split(".").map(Number);
    for (let i = 1; i < CHANGELOG.length; i++) {
      const newer = rank(CHANGELOG[i - 1]?.version ?? "");
      const older = rank(CHANGELOG[i]?.version ?? "");
      // Compared part by part, so 2.10 comes after 2.9 rather than before it.
      const decides = newer.findIndex((part, at) => part !== older[at]);
      expect(
        decides,
        `${String(CHANGELOG[i - 1]?.version)} vs ${String(CHANGELOG[i]?.version)}`,
      ).not.toBe(-1);
      expect(newer[decides] ?? 0).toBeGreaterThan(older[decides] ?? 0);
    }
  });

  it("never reuses a version, because the seen-state is keyed on it", () => {
    const versions = CHANGELOG.map((entry) => entry.version);
    expect(new Set(versions).size).toBe(versions.length);
  });

  it("points LATEST_VERSION at the top entry", () => {
    // Forgetting this is the silent one: the release ships and nobody is told
    // there is anything to read.
    expect(LATEST_VERSION).toBe(CHANGELOG[0]?.version);
  });

  it("writes every date as YYYY-MM-DD, so sorting them is sorting them", () => {
    for (const entry of CHANGELOG) {
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
      expect(Number.isNaN(Date.parse(entry.date))).toBe(false);
    }
  });

  it("gives every entry a title and at least one change", () => {
    for (const entry of CHANGELOG) {
      expect(entry.title.trim()).not.toBe("");
      expect(entry.changes.length).toBeGreaterThan(0);
    }
  });

  it("uses only the three kinds the page knows how to colour", () => {
    for (const entry of CHANGELOG) {
      for (const change of entry.changes) {
        expect(CHANGE_META[change.type]).toBeDefined();
        expect(change.text.trim()).not.toBe("");
      }
    }
  });
});

describe("the unseen mark and the dates", () => {
  it("marks the newest release unseen until it is the one recorded", async () => {
    const { hasUnseenChangelog } = await import("../entries");
    expect(hasUnseenChangelog(null)).toBe(true);
    expect(hasUnseenChangelog("0.1")).toBe(true);
    expect(hasUnseenChangelog(LATEST_VERSION)).toBe(false);
  });

  it("writes a date the way the page shows it", async () => {
    const { formatChangelogDate } = await import("../entries");
    expect(formatChangelogDate("2026-09-19")).toBe("19 septembre 2026");
  });
});
