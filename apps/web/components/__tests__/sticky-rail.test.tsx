// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STICKY_TOP } from "@/lib/chrome";
import { StickyRail } from "../sticky-rail";

/**
 * jsdom lays nothing out, so the rail's height and the window's are set by
 * hand, and the ResizeObserver is one the test can fire: it stands for the
 * rail growing as a hint is revealed.
 */

let railHeight = 0;
let observed: (() => void) | null = null;

beforeEach(() => {
  railHeight = 400;
  observed = null;
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(() => railHeight);
  vi.stubGlobal("innerHeight", 900);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        observed = callback;
      }
      observe = vi.fn();
      disconnect = vi.fn();
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function rail(): HTMLElement {
  return screen.getByTestId("rail");
}

describe("StickyRail", () => {
  it("rests below the navbar when it fits in the window", () => {
    render(<StickyRail data-testid="rail">indices</StickyRail>);
    expect(rail().tagName).toBe("ASIDE");
    expect(rail().style.top).toBe(`${String(STICKY_TOP)}px`);
  });

  it("stays in the flow, without a top, when it is taller than the window", () => {
    railHeight = 1200;
    render(<StickyRail data-testid="rail">indices</StickyRail>);
    expect(rail().style.top).toBe("");
  });

  it("steps back into the flow as it grows past the window, and out again", () => {
    render(<StickyRail data-testid="rail">indices</StickyRail>);
    expect(rail().style.top).not.toBe("");

    railHeight = 1200;
    act(() => observed?.());
    expect(rail().style.top).toBe("");

    railHeight = 400;
    act(() => observed?.());
    expect(rail().style.top).not.toBe("");
  });

  it("follows the window as it is resized", () => {
    render(<StickyRail data-testid="rail">indices</StickyRail>);
    vi.stubGlobal("innerHeight", 420);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(rail().style.top).toBe("");
  });

  it("still measures itself where there is no ResizeObserver", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    render(<StickyRail data-testid="rail">indices</StickyRail>);
    expect(rail().style.top).toBe(`${String(STICKY_TOP)}px`);
  });

  it("keeps the element, the class and the style the page gives it", () => {
    render(
      <StickyRail as="div" data-testid="rail" className="casier-preview" style={{ padding: 24 }}>
        aperçu
      </StickyRail>,
    );
    expect(rail().tagName).toBe("DIV");
    expect(rail().className).toBe("casier-preview");
    expect(rail().style.padding).toBe("24px");
    expect(rail().textContent).toBe("aperçu");
  });
});
