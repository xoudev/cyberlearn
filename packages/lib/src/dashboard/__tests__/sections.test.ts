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

  it("puts what will not wait, a duel received or a tournament under way, under the parcours", () => {
    expect(planSections({ hasResume: true, hasRecall: true, hasPlay: true })).toEqual([
      { key: "paths", number: "01" },
      { key: "play", number: "02" },
      { key: "resume", number: "03" },
      { key: "recall", number: "04" },
      { key: "progress", number: "05" },
    ]);
    expect(sectionNumber(planSections({ hasResume: false, hasRecall: false }), "play")).toBeNull();
  });
});
