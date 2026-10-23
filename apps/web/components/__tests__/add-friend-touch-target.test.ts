import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cssBlock, cssValue, mediaRule } from "@/test/css";

/**
 * "Ajouter" beside a player of the leaderboard or a classmate was about 17px
 * tall, on a card whose whole surface is the link to a profile: a touch beside
 * the button opened the profile instead of sending the request. On a touch
 * screen its hit area is about 45px tall now, without the look moving.
 *
 * There is no layout in jsdom, so the stylesheet's rules are what is checked.
 */

const SHEET = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");
const TOUCH = "(pointer: coarse)";

function required(body: string | undefined, what: string): string {
  if (body === undefined) throw new Error(`no ${what}`);
  return body;
}

/** The "px" amounts of an `inset` shorthand: "-14px -6px" gives [-14, -6]. */
function pixels(value: string | undefined): number[] {
  return (value ?? "").split(/\s+/u).map((part) => Number.parseFloat(part));
}

describe("the Ajouter button's touch target", () => {
  it("keeps its look: the same small bordered word, with no size of its own", () => {
    const base = required(cssBlock(SHEET, ".add-friend-btn"), ".add-friend-btn rule");
    expect(cssValue(base, "padding")).toBe("2px 7px");
    expect(cssValue(base, "min-height")).toBeUndefined();
    // The hit area is a pseudo-element's: the button's box is not enlarged.
    expect(cssValue(base, "position")).toBeUndefined();
  });

  it("grows its hit area on a touch screen, around the button", () => {
    const host = required(mediaRule(SHEET, TOUCH, ".add-friend-btn"), "touch rule of the button");
    expect(cssValue(host, "position")).toBe("relative");

    const area = required(
      mediaRule(SHEET, TOUCH, ".add-friend-btn::before"),
      "touch rule of the hit area",
    );
    expect(cssValue(area, "content")).toBe('""');
    expect(cssValue(area, "position")).toBe("absolute");
    const [vertical = 0, horizontal = 0] = pixels(cssValue(area, "inset"));
    // About 17px of button plus the margin above and below: a 44px finger.
    expect(17 - 2 * vertical).toBeGreaterThanOrEqual(44);
    // Out to the side, but short of the name, which sits 8px away.
    expect(horizontal).toBeLessThan(0);
    expect(-horizontal).toBeLessThan(8);
  });

  it("is not there for a mouse", () => {
    const base = required(cssBlock(SHEET, ".add-friend-btn"), ".add-friend-btn rule");
    expect(cssBlock(SHEET, ".add-friend-btn::before")).toBeUndefined();
    expect(cssValue(base, "inset")).toBeUndefined();
  });
});
