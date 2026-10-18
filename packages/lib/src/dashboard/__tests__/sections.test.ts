import { describe, expect, it } from "vitest";
import { planSections, sectionNumber } from "../sections";

describe("planSections", () => {
  it("leads with the parcours, whatever else is on the page", () => {
    // The complaint that started this: the parcours were section 07 of 07.
    for (const input of [
      { hasResume: true, hasRecall: true },
      { hasResume: false, hasRecall: false },
      { hasResume: true, hasRecall: false },
    ]) {
      expect(planSections(input)[0]).toEqual({ key: "paths", number: "01" });
    }
  });

  it("gives a full page every section, in order", () => {
    expect(planSections({ hasResume: true, hasRecall: true })).toEqual([
      { key: "paths", number: "01" },
      { key: "resume", number: "02" },
      { key: "recall", number: "03" },
      { key: "progress", number: "04" },
    ]);
  });

  it("drops the sections that would only announce an absence", () => {
    // A brand new account: nothing started, spaced repetition switched off.
    // What is left is what to do next and where they stand - not two empty
    // boxes explaining that they are empty.
    expect(planSections({ hasResume: false, hasRecall: false }).map((s) => s.key)).toEqual([
      "paths",
      "progress",
    ]);
  });

  it("closes the numbering up rather than leaving a hole", () => {
    const sections = planSections({ hasResume: false, hasRecall: true });
    expect(sections).toEqual([
      { key: "paths", number: "01" },
      { key: "recall", number: "02" },
      { key: "progress", number: "03" },
    ]);
  });

  it("keeps the resume section only when there is something to resume", () => {
    expect(sectionNumber(planSections({ hasResume: true, hasRecall: false }), "resume")).toBe("02");
    expect(
      sectionNumber(planSections({ hasResume: false, hasRecall: false }), "resume"),
    ).toBeNull();
  });

  it("puts the friends after the day's recall and before the reader's own record", () => {
    expect(
      planSections({ hasResume: true, hasRecall: true, hasFriends: true }).map((s) => s.key),
    ).toEqual(["paths", "resume", "recall", "friends", "progress"]);
    expect(
      sectionNumber(
        planSections({ hasResume: false, hasRecall: false, hasFriends: true }),
        "friends",
      ),
    ).toBe("02");
  });

  it("leaves the friends out for a reader who has none, or a caller that does not say", () => {
    expect(
      sectionNumber(
        planSections({ hasResume: false, hasRecall: false, hasFriends: false }),
        "friends",
      ),
    ).toBeNull();
    expect(
      sectionNumber(planSections({ hasResume: false, hasRecall: false }), "friends"),
    ).toBeNull();
  });
});
