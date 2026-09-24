import { describe, expect, it } from "vitest";
import { formatNumberFr } from "../format.js";

/**
 * A number printed the same way on the server and in the browser.
 *
 * The point is the separator: it is spelled out here rather than taken from
 * the engine's ICU, whose answer varies and caused a hydration error on the
 * landing page (Sentry JAVASCRIPT-NEXTJS-16).
 */

const NNBSP = " ";

describe("the grouping", () => {
  it("leaves numbers under a thousand alone", () => {
    expect(formatNumberFr(0)).toBe("0");
    expect(formatNumberFr(7)).toBe("7");
    expect(formatNumberFr(999)).toBe("999");
  });

  it("groups by three with a narrow no-break space", () => {
    expect(formatNumberFr(1950)).toBe(`1${NNBSP}950`);
    expect(formatNumberFr(1_234_567)).toBe(`1${NNBSP}234${NNBSP}567`);
  });

  it("never uses the plain no-break space older ICU builds print", () => {
    // U+00A0 is the other answer an engine can give. Getting it from one side
    // of the render and U+202F from the other is the whole defect.
    expect(formatNumberFr(1950)).not.toContain(" ");
  });

  it("matches what a current engine prints, so nothing visibly changes", () => {
    // Node here has current ICU. If this ever fails the separator convention
    // moved, and the constant above is the one line to change.
    expect(formatNumberFr(7550)).toBe((7550).toLocaleString("fr-FR"));
  });
});

describe("the edges", () => {
  it("keeps a minus sign", () => {
    expect(formatNumberFr(-1950)).toBe(`-1${NNBSP}950`);
  });

  it("rounds a stray float to the whole number it stands for", () => {
    expect(formatNumberFr(1950.0000000002)).toBe(`1${NNBSP}950`);
    expect(formatNumberFr(0.6)).toBe("1");
  });

  it("does not invent a number from something that is not one", () => {
    expect(formatNumberFr(Number.NaN)).toBe("NaN");
    expect(formatNumberFr(Number.POSITIVE_INFINITY)).toBe("Infinity");
  });
});
