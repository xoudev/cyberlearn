import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NAVBAR_PANEL_INSET, NAVBAR_PANEL_TOP } from "@/lib/chrome";
import { cssBlock, cssValue, mediaRule } from "@/test/css";

/**
 * The panels hanging from the navbar's friends and bell buttons were 340 and
 * 360px wide, absolute against the right edge of their button. The button sits
 * well in from the left of a phone, so at 375px the panels ran off the screen
 * by 117 and 91px: the title and the "Ouvrir un profil" field were cut off.
 * Below 768px they span the window; from 768px up nothing moves.
 *
 * There is no layout in jsdom, so the stylesheet's rules are what is checked.
 */

const SHEET = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");
const BELOW_TABLET = "(max-width: 767px)";

/** A rule that has to be there: its body, or a failure naming it. */
function required(body: string | undefined, what: string): string {
  if (body === undefined) throw new Error(`no ${what}`);
  return body;
}

describe.each([
  { selector: ".fp-panel", width: "340px", name: "the friends' panel" },
  { selector: ".notif-panel", width: "360px", name: "the notifications' panel" },
])("$name ($selector)", ({ selector, width }) => {
  it("hangs from its button from 768px up, as it always did", () => {
    const base = required(cssBlock(SHEET, selector), `${selector} rule`);
    expect(cssValue(base, "position")).toBe("absolute");
    expect(cssValue(base, "right")).toBe("0");
    expect(cssValue(base, "width")).toBe(width);
  });

  it("keeps its height and its scrolling, on a phone as well", () => {
    const base = required(cssBlock(SHEET, selector), `${selector} rule`);
    expect(cssValue(base, "max-height")).toBe("480px");
    expect(cssValue(base, "overflow-y")).toBe("auto");
    // The phone's rule only moves and resizes it: it never takes these away.
    const phone = required(mediaRule(SHEET, BELOW_TABLET, selector), `${selector} phone rule`);
    expect(cssValue(phone, "max-height")).toBeUndefined();
    expect(cssValue(phone, "overflow-y")).toBeUndefined();
  });

  it("spans the window below 768px, under the bar", () => {
    const phone = required(mediaRule(SHEET, BELOW_TABLET, selector), `${selector} phone rule`);
    expect(cssValue(phone, "position")).toBe("fixed");
    expect(cssValue(phone, "left")).toBe(`${String(NAVBAR_PANEL_INSET)}px`);
    expect(cssValue(phone, "right")).toBe(`${String(NAVBAR_PANEL_INSET)}px`);
    expect(cssValue(phone, "width")).toBe("auto");
    expect(cssValue(phone, "top")).toBe(`${String(NAVBAR_PANEL_TOP)}px`);
  });
});

describe("the phone's rule", () => {
  it("comes after both panels' own, or their base rules would win", () => {
    const phoneAt = SHEET.indexOf("@media (max-width: 767px) {\n  .fp-panel,\n  .notif-panel {");
    expect(phoneAt).toBeGreaterThan(SHEET.indexOf("\n.fp-panel {"));
    expect(phoneAt).toBeGreaterThan(SHEET.indexOf("\n.notif-panel {"));
  });
});
