import { describe, expect, it } from "vitest";
import { countMissions, missionStates, publishedLesson } from "../missions";

describe("publishedLesson", () => {
  const lesson = (status: string) => ({ id: "l1", slug: "l1", title: "L1", status });

  it("hands back a published lesson, embedded alone or as a list", () => {
    expect(publishedLesson(lesson("PUBLISHED"))).toEqual(lesson("PUBLISHED"));
    expect(publishedLesson([lesson("PUBLISHED")])).toEqual(lesson("PUBLISHED"));
  });

  it("drops a draft or an archived lesson, which RLS still shows an administrator", () => {
    // The path page and the home card read the lessons through this: the
    // site's PUBLISHED_PATH_LESSON draws neither as a mission.
    expect(publishedLesson(lesson("DRAFT"))).toBeNull();
    expect(publishedLesson([lesson("ARCHIVED")])).toBeNull();
  });

  it("reads a lesson RLS kept from the reader as none", () => {
    expect(publishedLesson(null)).toBeNull();
    expect(publishedLesson(undefined)).toBeNull();
    expect(publishedLesson([])).toBeNull();
  });
});

describe("countMissions", () => {
  it("counts a path's published lessons", () => {
    expect(
      countMissions([{ lessons: { status: "PUBLISHED" } }, { lessons: [{ status: "PUBLISHED" }] }]),
    ).toBe(2);
  });

  it("leaves out a draft, an archived lesson and one RLS kept from the reader", () => {
    // The link stays when a lesson is archived or imported as a draft; the
    // site counts neither (PUBLISHED_PATH_LESSON), and the card did.
    expect(
      countMissions([
        { lessons: { status: "PUBLISHED" } },
        { lessons: { status: "DRAFT" } },
        { lessons: { status: "ARCHIVED" } },
        { lessons: null },
        { lessons: [] },
      ]),
    ).toBe(1);
  });

  it("reads a path without links as empty", () => {
    expect(countMissions(null)).toBe(0);
    expect(countMissions([])).toBe(0);
  });
});

type Status = "COMPLETED" | "IN_PROGRESS" | null;

const path = (...statuses: Status[]) => statuses.map((status) => ({ status, waived: false }));

/** A mission per entry: "W" is one the placement test waived, never started. */
const withWaivers = (...entries: (Status | "W")[]) =>
  entries.map((entry) =>
    entry === "W" ? { status: null, waived: true } : { status: entry, waived: false },
  );

describe("missionStates", () => {
  it("puts the reader on the first mission not completed and locks the rest", () => {
    expect(missionStates(path("COMPLETED", "IN_PROGRESS", null, null))).toEqual([
      "done",
      "current",
      "locked",
      "locked",
    ]);
  });

  it("opens every other mission to an administrator, without moving where they are", () => {
    expect(missionStates(path("COMPLETED", null, null, "COMPLETED"), true)).toEqual([
      "done",
      "current",
      "open",
      "done",
    ]);
  });

  it("has no current mission once everything is completed", () => {
    expect(missionStates(path("COMPLETED", "COMPLETED"), true)).toEqual(["done", "done"]);
  });

  it("opens the mission after one completed out of order, as the site does", () => {
    expect(missionStates(path(null, "COMPLETED", null, null))).toEqual([
      "current",
      "done",
      "open",
      "locked",
    ]);
  });

  // The placement test's result says the waived levels are unlocked.
  it("opens the waived missions and the one after them, and starts the reader past them", () => {
    expect(missionStates(withWaivers("W", "W", null, null))).toEqual([
      "open",
      "open",
      "current",
      "locked",
    ]);
  });

  it("opens a waived mission even behind one left to do", () => {
    expect(missionStates(withWaivers(null, null, "W", null))).toEqual([
      "current",
      "locked",
      "open",
      "open",
    ]);
  });

  it("starts the reader on the first waived mission when nothing else is left", () => {
    expect(missionStates(withWaivers("COMPLETED", "W", "W"))).toEqual(["done", "current", "open"]);
  });

  it("shows a waived mission the reader went on to complete as done", () => {
    expect(
      missionStates([
        { status: "COMPLETED", waived: true },
        { status: null, waived: false },
      ]),
    ).toEqual(["done", "current"]);
  });
});
