import { describe, expect, it } from "vitest";
import { countMissions, missionStates } from "../missions";

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

const path = (...statuses: ("COMPLETED" | "IN_PROGRESS" | null)[]) =>
  statuses.map((status) => ({ status }));

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
});
