import { describe, expect, it } from "vitest";
import { drawableText, previewCardText, previewHandle } from "../preview-card";

/**
 * A profile's link preview: the owner's name and figures for a public
 * profile, and a card that names nobody for a private one or a handle that
 * does not exist - a shared link is read by strangers and crawlers.
 */

describe("previewCardText", () => {
  it("names a public profile's owner, with their figures", () => {
    const text = previewCardText({
      username: "alex",
      displayName: "Alex Martin",
      xpTotal: 12_400,
      streakDays: 5,
      badges: 17,
    });

    expect(text.title).toBe("Alex Martin");
    expect(text.subtitle).toBe("@alex");
    expect(text.eyebrow).toBe("CyberLearn · profil public");
    expect(text.stats.map((s) => s.label)).toEqual(["Niveau", "XP", "Badges", "Série"]);
    expect(text.stats.find((s) => s.label === "Série")?.value).toBe("5 j");
    expect(text.stats.find((s) => s.label === "XP")?.value).toMatch(/^12\s?400$/u);
  });

  it("falls back to the handle when the display name is empty", () => {
    const text = previewCardText({
      username: "alex",
      displayName: "  ",
      xpTotal: 0,
      streakDays: 0,
      badges: 1,
    });
    expect(text.title).toBe("alex");
    expect(text.stats[2]).toEqual({ label: "Badge", value: "1" });
  });

  it("names nobody behind a private or missing profile", () => {
    const text = previewCardText(null);
    expect(text.title).toBe("CyberLearn");
    expect(text.stats).toEqual([]);
    expect(JSON.stringify(text)).not.toContain("@");
  });

  it("writes only what the bundled font draws, so nothing is fetched to draw it", () => {
    const text = previewCardText({
      username: "alex",
      displayName: "🔥 Ĭrène 李 Łucja",
      xpTotal: 12_400,
      streakDays: 5,
      badges: 1_250,
    });
    expect(text.title).toBe("Irène Łucja");
    // French figures set thousands apart with a narrow no-break space, which
    // the font lacks; the no-break space it has stands in.
    const narrow = String.fromCodePoint(0x202f);
    const noBreak = String.fromCodePoint(0x00a0);
    for (const value of [...text.stats.map((s) => s.value), text.title, text.subtitle]) {
      expect(value.includes(narrow)).toBe(false);
    }
    expect(text.stats.find((s) => s.label === "XP")?.value).toBe(`12${noBreak}400`);
  });

  it("falls back to the handle when nothing of the name can be drawn", () => {
    const text = previewCardText({
      username: "alex",
      displayName: "李小龍 🐉",
      xpTotal: 0,
      streakDays: 0,
      badges: 0,
    });
    expect(text.title).toBe("alex");
  });
});

describe("drawableText", () => {
  it("keeps Latin, its accents and Cyrillic, and leaves out the rest", () => {
    expect(drawableText("Zoé Œuvre")).toBe("Zoé Œuvre");
    expect(drawableText("Дмитрий")).toBe("Дмитрий");
    expect(drawableText("ﺳﺎﺭﺓ")).toBe("");
    expect(drawableText("  Alex   🚀  Martin ")).toBe("Alex Martin");
  });
});

describe("previewHandle", () => {
  it("reads a handle from the address, and refuses what no profile could have", () => {
    expect(previewHandle(" alex ")).toBe("alex");
    expect(previewHandle("")).toBeNull();
    expect(previewHandle("x".repeat(65))).toBeNull();
    expect(previewHandle(undefined)).toBeNull();
  });
});
