import { describe, expect, it } from "vitest";
import { previewCardText } from "../preview-card";

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
});
