import { describe, expect, it } from "vitest";
import { avatarLabel, examWait, userExportFilename } from "../user-record";

describe("avatarLabel", () => {
  it.each([
    [null, "Aucun : ses initiales"],
    ["", "Aucun : ses initiales"],
    ["__upload:11111111-1111-4111-8111-111111111111/a.webp", "Photo envoyée"],
    ["__glyph:skull", "Glyphe"],
    ["/avatars/av-1.svg", "Avatar intégré n° 1"],
    ["/avatars/av-8.svg", "Avatar intégré n° 8"],
    ["https://avatars.githubusercontent.com/u/1?v=4", "Image d'un compte lié (GitHub)"],
    ["/avatars/av-99.svg", "Autre"],
  ])("names %s as %s", (value, label) => {
    expect(avatarLabel(value)).toBe(label);
  });
});

describe("examWait", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

  it("says an attempt never handed in is running while in its time", () => {
    expect(
      examWait({ startedAt: hoursAgo(0.25), submittedAt: null, cooldownWaivedAt: null }, now),
    ).toEqual({ state: "running" });
  });

  it("says an attempt never handed in and out of time has expired", () => {
    expect(
      examWait({ startedAt: hoursAgo(72), submittedAt: null, cooldownWaivedAt: null }, now),
    ).toEqual({ state: "expired" });
  });

  it("gives the end of the 48 hours after an attempt handed in", () => {
    expect(
      examWait({ startedAt: hoursAgo(3), submittedAt: hoursAgo(2), cooldownWaivedAt: null }, now),
    ).toEqual({
      state: "waiting",
      until: new Date("2026-10-19T10:00:00Z"),
    });
  });

  it("says when the wait is over", () => {
    expect(
      examWait({ startedAt: hoursAgo(50), submittedAt: hoursAgo(49), cooldownWaivedAt: null }, now),
    ).toEqual({
      state: "open",
    });
  });

  it("says when an administrator lifted it", () => {
    expect(
      examWait(
        { startedAt: hoursAgo(3), submittedAt: hoursAgo(2), cooldownWaivedAt: hoursAgo(1) },
        now,
      ),
    ).toEqual({
      state: "waived",
      at: hoursAgo(1),
    });
  });
});

describe("userExportFilename", () => {
  const USER = "11111111-1111-4111-8111-111111111111";

  it("names the file after the account and the day", () => {
    expect(userExportFilename(USER, new Date("2026-10-17T12:00:00Z"))).toBe(
      `cyberlearn-export-${USER}-2026-10-17.json`,
    );
  });

  it("counts the day in Paris, not in UTC", () => {
    expect(userExportFilename(USER, new Date("2026-10-17T22:30:00Z"))).toBe(
      `cyberlearn-export-${USER}-2026-10-18.json`,
    );
  });
});
