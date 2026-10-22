// @vitest-environment jsdom
import React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GLOSSARY_SHIFT_PROPERTY,
  GLOSSARY_TIP_MARGIN,
  GlossaryTipFit,
  fitGlossaryTip,
  tipShift,
} from "../glossary-tip-fit";

/**
 * A glossary word's definition starts at the word and spreads to the right.
 * On a phone, or at the end of a line, the page's `overflow-x: clip` cut it:
 * the end of its lines was missing and neither scrolling nor zooming brought
 * it back. It now moves sideways, by a custom property, until it fits.
 */

const M = GLOSSARY_TIP_MARGIN;

describe("tipShift", () => {
  const phone = { left: 0, right: 375 };

  it("leaves a definition that fits where it is", () => {
    expect(tipShift({ left: 16, right: 316 }, phone)).toBe(0);
  });

  it("brings back a definition that spreads past the right edge", () => {
    // A word at x=200 on a 375px phone, a definition of 300px.
    expect(tipShift({ left: 200, right: 500 }, phone)).toBe(375 - M - 500);
  });

  it("brings back a definition that starts before the left edge", () => {
    expect(tipShift({ left: -20, right: 280 }, phone)).toBe(M + 20);
  });

  it("keeps the margin clear of the edge it touches", () => {
    expect(tipShift({ left: 75, right: 375 }, phone)).toBe(-M);
    expect(tipShift({ left: 5, right: 305 }, phone)).toBe(M - 5);
  });

  it("keeps the start of a definition wider than the room it has", () => {
    expect(tipShift({ left: 100, right: 500 }, { left: 0, right: 300 })).toBe(M - 100);
  });

  it("measures from the column, not the window, when the notes are docked", () => {
    // 1440px window, the notes take the last 400px: the column ends at 1040.
    const column = { left: 256, right: 1040 };
    expect(tipShift({ left: 900, right: 1220 }, column)).toBe(1040 - M - 1220);
    expect(tipShift({ left: 400, right: 720 }, column)).toBe(0);
  });
});

/**
 * A box at these coordinates. jsdom has no layout, so it has no DOMRect either:
 * the code under test reads left and right only.
 */
function box(left: number, width: number): DOMRect {
  return {
    left,
    right: left + width,
    top: 0,
    bottom: 60,
    width,
    height: 60,
    x: left,
    y: 0,
    toJSON: () => ({}),
  };
}

/** A word and its definition, laid out by hand: jsdom has no layout. */
function drawWord(options: {
  tip: { left: number; width: number };
  main?: { left: number; right: number; paddingRight?: string };
}): { word: HTMLElement; tip: HTMLElement } {
  const main = document.createElement("main");
  const { left, right, paddingRight } = options.main ?? { left: 0, right: 375 };
  main.getBoundingClientRect = () => box(left, right - left);
  if (paddingRight) main.style.paddingRight = paddingRight;
  const word = document.createElement("span");
  word.className = "glossary-term";
  word.tabIndex = 0;
  word.textContent = "pare-feu";
  const tip = document.createElement("span");
  tip.className = "glossary-tip";
  tip.getBoundingClientRect = () =>
    // Moves with the shift the way `left: var(--glossary-shift)` moves it.
    box(
      options.tip.left + (Number.parseFloat(word.style.getPropertyValue("--glossary-shift")) || 0),
      options.tip.width,
    );
  word.append(tip);
  main.append(word);
  document.body.append(main);
  return { word, tip };
}

beforeEach(() => {
  Object.defineProperty(document.documentElement, "clientWidth", {
    configurable: true,
    value: 375,
  });
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("fitGlossaryTip", () => {
  it("shifts a definition that would be cut on the right", () => {
    const { word } = drawWord({ tip: { left: 220, width: 300 } });
    fitGlossaryTip(word);
    expect(word.style.getPropertyValue(GLOSSARY_SHIFT_PROPERTY)).toBe(`${String(375 - M - 520)}px`);
  });

  it("writes nothing when the definition fits", () => {
    const { word } = drawWord({ tip: { left: 20, width: 300 } });
    fitGlossaryTip(word);
    expect(word.style.getPropertyValue(GLOSSARY_SHIFT_PROPERTY)).toBe("");
  });

  it("forgets an earlier shift: the window may have been resized since", () => {
    const { word } = drawWord({ tip: { left: 20, width: 300 } });
    word.style.setProperty(GLOSSARY_SHIFT_PROPERTY, "-80px");
    fitGlossaryTip(word);
    expect(word.style.getPropertyValue(GLOSSARY_SHIFT_PROPERTY)).toBe("");
  });

  it("measures the definition drawn, then puts its display back to the stylesheet's", () => {
    const { word, tip } = drawWord({ tip: { left: 20, width: 300 } });
    let displayWhileMeasured = "";
    let visibilityWhileMeasured = "";
    const measure = tip.getBoundingClientRect.bind(tip);
    tip.getBoundingClientRect = () => {
      displayWhileMeasured = tip.style.display;
      visibilityWhileMeasured = tip.style.visibility;
      return measure();
    };
    fitGlossaryTip(word);
    // Hidden by the sheet until hovered, so it is shown, unseen, to be measured.
    expect(displayWhileMeasured).toBe("block");
    expect(visibilityWhileMeasured).toBe("hidden");
    expect(tip.style.display).toBe("");
    expect(tip.style.visibility).toBe("");
  });

  it("keeps clear of the docked notes, which sit in the padding of <main>", () => {
    const { word } = drawWord({
      tip: { left: 900, width: 320 },
      main: { left: 256, right: 1440, paddingRight: "400px" },
    });
    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: 1440,
    });
    fitGlossaryTip(word);
    expect(word.style.getPropertyValue(GLOSSARY_SHIFT_PROPERTY)).toBe(
      `${String(1040 - M - 1220)}px`,
    );
  });
});

describe("GlossaryTipFit", () => {
  it("fits a word's definition when it takes the focus, as a tap does", () => {
    render(<GlossaryTipFit />);
    const { word } = drawWord({ tip: { left: 220, width: 300 } });
    fireEvent.focusIn(word);
    expect(word.style.getPropertyValue(GLOSSARY_SHIFT_PROPERTY)).not.toBe("");
  });

  it("fits it when the pointer comes over the word", () => {
    render(<GlossaryTipFit />);
    const { word } = drawWord({ tip: { left: 220, width: 300 } });
    fireEvent.pointerOver(word);
    expect(word.style.getPropertyValue(GLOSSARY_SHIFT_PROPERTY)).not.toBe("");
  });

  it("leaves what is not a glossary word alone", () => {
    render(<GlossaryTipFit />);
    const { word } = drawWord({ tip: { left: 220, width: 300 } });
    const other = document.createElement("p");
    document.body.append(other);
    fireEvent.pointerOver(other);
    expect(word.style.getPropertyValue(GLOSSARY_SHIFT_PROPERTY)).toBe("");
  });

  it("does not measure again for a move between the word and its definition", () => {
    render(<GlossaryTipFit />);
    const { word, tip } = drawWord({ tip: { left: 220, width: 300 } });
    const measure = vi.spyOn(tip, "getBoundingClientRect");
    fireEvent.pointerOver(tip, { relatedTarget: word });
    expect(measure).not.toHaveBeenCalled();
  });

  it("stops listening once the last one is gone, and listens once for many", () => {
    const first = render(<GlossaryTipFit />);
    const second = render(<GlossaryTipFit />);
    const { word, tip } = drawWord({ tip: { left: 220, width: 300 } });
    const measure = vi.spyOn(tip, "getBoundingClientRect");
    fireEvent.focusIn(word);
    expect(measure).toHaveBeenCalledTimes(1);

    first.unmount();
    measure.mockClear();
    fireEvent.focusIn(word);
    expect(measure).toHaveBeenCalledTimes(1);

    second.unmount();
    measure.mockClear();
    fireEvent.focusIn(word);
    expect(measure).not.toHaveBeenCalled();
  });
});

describe("the stylesheet", () => {
  const css = readFileSync(path.resolve(__dirname, "../../../../../globals.css"), "utf8");

  it("reads the shift for the definition's left edge, zero by default", () => {
    expect(css).toMatch(
      new RegExp(`\\.glossary-tip \\{[^}]*left: var\\(${GLOSSARY_SHIFT_PROPERTY}, 0px\\);`),
    );
  });

  it("still shows the definition from the word's hover and focus alone", () => {
    expect(css).toMatch(
      /\.glossary-term:hover > \.glossary-tip,\s*\.glossary-term:focus > \.glossary-tip,\s*\.glossary-term:focus-within > \.glossary-tip \{\s*display: block;/,
    );
  });
});
