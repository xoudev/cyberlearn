import { describe, expect, it } from "vitest";
import { missionStates } from "../missions";

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
