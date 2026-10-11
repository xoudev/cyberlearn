import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NAVBAR_HEIGHT, STICKY_TOP, TOAST_TOP_OFFSET, railStickyTop } from "../chrome";

describe("app chrome measurements", () => {
  it("starts a toast below the navbar rather than across it", () => {
    // The one thing that must stay true of these two numbers. A toast at the
    // top centre lands exactly where the search box and the notification bell
    // are, so the offset is not decoration: it is what keeps the bar usable
    // while a message is on screen.
    expect(TOAST_TOP_OFFSET).toBeGreaterThan(NAVBAR_HEIGHT);
  });

  it("rests a sticky element below the navbar, which is sticky too", () => {
    expect(STICKY_TOP).toBeGreaterThan(NAVBAR_HEIGHT);
  });

  it("lands an anchor where a sticky element rests", () => {
    // CSS cannot import the number, so globals.css carries a copy of it.
    const css = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");
    expect(css).toContain(`scroll-padding-top: ${String(STICKY_TOP)}px;`);
  });
});

describe("railStickyTop", () => {
  const viewport = 900;
  // The air a stuck rail keeps below the bar, and above the bottom of the window.
  const gap = STICKY_TOP - NAVBAR_HEIGHT;
  // The room a stuck rail has: below the bar, with the same air under it.
  const room = viewport - STICKY_TOP - gap;

  it("rests a rail below the bar when it can be read whole there", () => {
    expect(railStickyTop(480, viewport)).toBe(STICKY_TOP);
    expect(railStickyTop(room, viewport)).toBe(STICKY_TOP);
    // A rail the page hides (display: none) measures nothing.
    expect(railStickyTop(0, viewport)).toBe(STICKY_TOP);
  });

  it("rests a taller rail by its bottom, with the same air under it", () => {
    expect(railStickyTop(room + 1, viewport) + room + 1).toBe(viewport - gap);
    expect(railStickyTop(1500, viewport) + 1500).toBe(viewport - gap);
  });

  it("gives a rail taller than the window a negative top, so it scrolls before it stays", () => {
    expect(railStickyTop(viewport, viewport)).toBeLessThan(0);
    expect(railStickyTop(1500, viewport)).toBe(viewport - 1500 - gap);
  });

  it("moves the rail a pixel, not a screen, as it grows one past the room", () => {
    // Growing by a pixel (a hint revealed, a line wrapped) must not make the
    // rail jump: the top it rests at slides with its height.
    expect(railStickyTop(room + 1, viewport)).toBe(STICKY_TOP - 1);
  });

  it("counts the navbar against the window, not just the rail against it", () => {
    // A rail as tall as the window minus a little rests by its bottom: the bar
    // takes its 56 pixels first.
    expect(railStickyTop(viewport - 20, viewport)).toBeLessThan(STICKY_TOP);
  });
});
