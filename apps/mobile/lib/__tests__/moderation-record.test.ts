import { describe, expect, it } from "vitest";
import { moderationOutcome, recordStamp, surfaceNoun } from "../moderation-record";

describe("the moderation record in the app", () => {
  it("writes a date and time the way the site's Intl formatting does, all year round", () => {
    const intl = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });
    for (let month = 0; month < 12; month++) {
      const date = new Date(2026, month, month + 1, month, month * 5);
      expect(recordStamp(date.toISOString())).toBe(intl.format(date));
    }
  });

  it("uses the site's words for the surface and the outcome", () => {
    expect(surfaceNoun("forum.post")).toBe("ton message");
    expect(moderationOutcome("OVERTURNED").label).toBe("Fausse alerte · rétabli");
  });
});
