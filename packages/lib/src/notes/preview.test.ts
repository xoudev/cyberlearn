import { describe, expect, it } from "vitest";
import { noteExcerpt, timeAgo } from "./preview.js";

describe("noteExcerpt", () => {
  it("drops the markdown and the code blocks, keeps the words", () => {
    expect(noteExcerpt("# TCP\n\n**Trois** échanges : `SYN`\n```\nnc -l 80\n```\n> fin")).toBe(
      "TCP Trois échanges : SYN fin",
    );
  });

  it("cuts a long note at 150 characters", () => {
    const long = "mot ".repeat(60);
    const out = noteExcerpt(long);
    expect(out.length).toBeLessThanOrEqual(150);
    expect(out.endsWith("…")).toBe(true);
  });

  it("says nothing for an empty note, for the card to word it", () => {
    expect(noteExcerpt("  \n ")).toBe("");
  });
});

describe("timeAgo", () => {
  const now = Date.parse("2026-09-25T12:00:00Z");
  const ago = (ms: number): string => new Date(now - ms).toISOString();

  it("counts minutes, hours and days", () => {
    expect(timeAgo(ago(20_000), now)).toBe("à l'instant");
    expect(timeAgo(ago(5 * 60_000), now)).toBe("il y a 5 min");
    expect(timeAgo(ago(3 * 3_600_000), now)).toBe("il y a 3 h");
    expect(timeAgo(ago(4 * 86_400_000), now)).toBe("il y a 4 j");
  });

  it("gives the date once it is a month old, or before the clock is known", () => {
    const old = ago(40 * 86_400_000);
    expect(timeAgo(old, now)).toBe(new Date(old).toLocaleDateString("fr-FR"));
    expect(timeAgo(ago(60_000), null)).toBe(new Date(ago(60_000)).toLocaleDateString("fr-FR"));
  });

  it("never counts into the future", () => {
    expect(timeAgo(new Date(now + 60_000).toISOString(), now)).toBe("à l'instant");
  });
});
