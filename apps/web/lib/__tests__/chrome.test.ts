import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NAVBAR_HEIGHT, STICKY_TOP, TOAST_TOP_OFFSET, railFitsBelowNavbar } from "../chrome";

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

describe("railFitsBelowNavbar", () => {
  const viewport = 900;
  // The room a stuck rail has: below the bar, with the same air under it.
  const room = viewport - STICKY_TOP - (STICKY_TOP - NAVBAR_HEIGHT);

  it("lets a rail stick when it can be read whole below the bar", () => {
    expect(railFitsBelowNavbar(480, viewport)).toBe(true);
    expect(railFitsBelowNavbar(room, viewport)).toBe(true);
  });

  it("leaves a rail in the flow when its bottom would stay out of sight", () => {
    expect(railFitsBelowNavbar(room + 1, viewport)).toBe(false);
    expect(railFitsBelowNavbar(1500, viewport)).toBe(false);
  });

  it("counts the navbar against the window, not just the rail against it", () => {
    // A rail as tall as the window minus a little still does not fit: the bar
    // takes its 56 pixels first.
    expect(railFitsBelowNavbar(viewport - 20, viewport)).toBe(false);
  });
});
