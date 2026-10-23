import { describe, expect, it } from "vitest";
import { TOO_MANY_MESSAGES, tooManyRequests, waitLabel } from "../rate-limit-copy";

describe("waitLabel", () => {
  it("says whole minutes, rounded up, and never fewer than one", () => {
    expect(waitLabel(0)).toBe("1 minute");
    expect(waitLabel(1)).toBe("1 minute");
    expect(waitLabel(30)).toBe("1 minute");
    expect(waitLabel(60)).toBe("1 minute");
    expect(waitLabel(61)).toBe("2 minutes");
    expect(waitLabel(900)).toBe("15 minutes");
    expect(waitLabel(901)).toBe("16 minutes");
  });
});

describe("the limit messages", () => {
  it("tutoie, as the rest of the site does", () => {
    expect(TOO_MANY_MESSAGES).toBe("Trop de messages. Réessaie dans une minute.");
    expect(tooManyRequests(900)).toBe("Trop de demandes. Réessaie dans 15 minutes.");
    expect(tooManyRequests(30)).toBe("Trop de demandes. Réessaie dans 1 minute.");
  });

  it("never switches to the formal register", () => {
    for (const message of [TOO_MANY_MESSAGES, tooManyRequests(10), tooManyRequests(500)]) {
      expect(message).not.toMatch(/Réessayez|\bvous\b/u);
    }
  });
});
