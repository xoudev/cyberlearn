import { describe, expect, it } from "vitest";
import { planSections, sectionNumber } from "../sections";

describe("planSections", () => {
  it("leads with the parcours, whatever else is on the page", () => {
    // The complaint that started this: the parcours were section 07 of 07.
    for (const input of [
      { hasResume: true, dueReviews: 3 },
      { hasResume: false, dueReviews: 0 },
      { hasResume: true, dueReviews: 0 },
    ]) {
      expect(planSections(input)[0]).toEqual({ key: "paths", number: "01" });
    }
  });

  it("gives a full page every section, in order", () => {
    expect(planSections({ hasResume: true, dueReviews: 2 })).toEqual([
      { key: "paths", number: "01" },
      { key: "resume", number: "02" },
      { key: "reviews", number: "03" },
      { key: "progress", number: "04" },
    ]);
  });

  it("drops the sections that would only announce an absence", () => {
    // A brand new account: nothing started, nothing due. What is left is what
    // to do next and where they stand - not two empty boxes explaining that
    // they are empty.
    expect(planSections({ hasResume: false, dueReviews: 0 }).map((s) => s.key)).toEqual([
      "paths",
      "progress",
    ]);
  });

  it("closes the numbering up rather than leaving a hole", () => {
    const sections = planSections({ hasResume: false, dueReviews: 4 });
    expect(sections).toEqual([
      { key: "paths", number: "01" },
      { key: "reviews", number: "02" },
      { key: "progress", number: "03" },
    ]);
  });

  it("keeps the resume section only when there is something to resume", () => {
    expect(sectionNumber(planSections({ hasResume: true, dueReviews: 0 }), "resume")).toBe("02");
    expect(sectionNumber(planSections({ hasResume: false, dueReviews: 0 }), "resume")).toBeNull();
  });
});
