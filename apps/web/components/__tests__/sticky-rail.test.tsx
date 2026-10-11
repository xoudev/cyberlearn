// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NAVBAR_HEIGHT, STICKY_TOP } from "@/lib/chrome";
import { StickyRail } from "../sticky-rail";

/**
 * jsdom lays nothing out, so the rail's height and the window's are set by
 * hand, and the ResizeObserver is one the test can fire: it stands for the
 * rail growing as a hint is revealed.
 */

let railHeight = 0;
let observed: (() => void) | null = null;

// The air a stuck rail keeps below the bar, and above the bottom of the window.
const GAP = STICKY_TOP - NAVBAR_HEIGHT;

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

/** The rail's `top`, in pixels, or NaN when it has none. */
function top(): number {
  return Number.parseFloat(rail().style.top);
}

describe("StickyRail", () => {
  it("rests below the navbar when it fits in the window", () => {
    render(<StickyRail data-testid="rail">indices</StickyRail>);
    expect(rail().tagName).toBe("ASIDE");
    expect(rail().style.top).toBe(`${String(STICKY_TOP)}px`);
  });

  it("sticks by its bottom, with a negative top, when it is taller than the window", () => {
    railHeight = 1200;
    render(<StickyRail data-testid="rail">indices</StickyRail>);
    // It scrolls with the page until its last line is in sight, then stays:
    // that line rests just above the bottom of the window, not below it.
    expect(top()).toBeLessThan(0);
    expect(top() + railHeight).toBe(900 - GAP);
  });

  it("trades its top for its bottom as it grows past the window, and back", () => {
    render(<StickyRail data-testid="rail">indices</StickyRail>);
    expect(top()).toBe(STICKY_TOP);

    railHeight = 1200;
    act(() => observed?.());
    expect(top()).toBeLessThan(0);
    expect(top() + railHeight).toBe(900 - GAP);

    railHeight = 400;
    act(() => observed?.());
    expect(top()).toBe(STICKY_TOP);
  });

  it("follows the window as it is resized", () => {
    render(<StickyRail data-testid="rail">indices</StickyRail>);
    vi.stubGlobal("innerHeight", 420);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    // Too short a window for the rail below the bar: it rests by its bottom.
    expect(top() + railHeight).toBe(420 - GAP);
    expect(top()).toBeLessThan(STICKY_TOP);
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

  it("can be a section, for a column that is one of the page's sections", () => {
    render(
      <StickyRail as="section" data-testid="rail" aria-label="Les équipes">
        classement
      </StickyRail>,
    );
    expect(rail().tagName).toBe("SECTION");
    expect(rail().getAttribute("aria-label")).toBe("Les équipes");
  });

  it("is drawn without a top on the server, before it has been measured", () => {
    const html = renderToStaticMarkup(<StickyRail style={{ padding: 24 }}>indices</StickyRail>);
    expect(html).toBe('<aside style="padding:24px">indices</aside>');
  });
});
