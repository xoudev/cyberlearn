import { describe, expect, it } from "vitest";
import { reviewSummary, splitReviews, toReviewItems, type RawReviewRow } from "../revisions";

const lesson = (id: string, difficulty = "BEGINNER", xpReward = 50) => ({
  id,
  slug: `lecon-${id}`,
  title: `Leçon ${id}`,
  category: "DEV" as const,
  difficulty: difficulty as "BEGINNER",
  xpReward,
});

const NOW = new Date("2026-09-24T10:00:00Z");
const at = (hours: number): string => new Date(NOW.getTime() + hours * 3_600_000).toISOString();

describe("toReviewItems", () => {
  it("reads the embedded lesson whether it comes as an object or an array", () => {
    const rows: RawReviewRow[] = [
      { id: "s1", nextReviewAt: at(-1), lesson: lesson("a") },
      { id: "s2", nextReviewAt: at(-2), lesson: [lesson("b")] },
    ];
    expect(toReviewItems(rows).map((i) => [i.scheduleId, i.slug])).toEqual([
      ["s1", "lecon-a"],
      ["s2", "lecon-b"],
    ]);
  });

  it("drops a review whose lesson the learner can no longer read", () => {
    expect(toReviewItems([{ id: "s1", nextReviewAt: at(-1), lesson: null }])).toEqual([]);
    expect(toReviewItems([{ id: "s1", nextReviewAt: at(-1), lesson: [] }])).toEqual([]);
  });
});

describe("splitReviews", () => {
  const items = toReviewItems([
    { id: "later", nextReviewAt: at(48), lesson: lesson("c") },
    { id: "old", nextReviewAt: at(-72), lesson: lesson("a") },
    { id: "now", nextReviewAt: at(0), lesson: lesson("b") },
    { id: "soon", nextReviewAt: at(5), lesson: lesson("d") },
  ]);

  it("puts what is due now or before first, oldest first, and the rest after", () => {
    const { due, upcoming } = splitReviews(items, NOW);
    expect(due.map((i) => i.scheduleId)).toEqual(["old", "now"]);
    expect(upcoming.map((i) => i.scheduleId)).toEqual(["soon", "later"]);
  });

  it("keeps only the next few upcoming, as the site does", () => {
    expect(splitReviews(items, NOW, 1).upcoming.map((i) => i.scheduleId)).toEqual(["soon"]);
  });
});

describe("reviewSummary", () => {
  it("adds up the count, the minutes and the XP on offer", () => {
    const due = toReviewItems([
      { id: "s1", nextReviewAt: at(-1), lesson: lesson("a", "BEGINNER", 50) },
      { id: "s2", nextReviewAt: at(-1), lesson: lesson("b", "ADVANCED", 125) },
    ]);
    expect(reviewSummary(due)).toEqual({ count: 2, minutes: 7, xp: 17 });
    expect(reviewSummary([])).toEqual({ count: 0, minutes: 0, xp: 0 });
  });
});

describe("a review read from the database, on a phone in Paris", () => {
  it("is due when the server says so, not two hours early", () => {
    const previous = process.env.TZ;
    process.env.TZ = "Europe/Paris";
    try {
      // The Data API's text for 11:00 UTC: no offset.
      const items = toReviewItems([
        { id: "s1", nextReviewAt: "2026-09-24T11:00:00", lesson: lesson("a") },
      ]);
      expect(items[0]?.nextReviewAt).toBe("2026-09-24T11:00:00.000Z");
      // At 10:00 UTC it is still an hour away; read as local time it was due.
      expect(splitReviews(items, NOW).due).toHaveLength(0);
      expect(splitReviews(items, new Date("2026-09-24T11:00:00Z")).due).toHaveLength(1);
    } finally {
      process.env.TZ = previous;
    }
  });
});
