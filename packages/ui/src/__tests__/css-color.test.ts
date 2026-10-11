import { afterEach, describe, expect, it, vi } from "vitest";
import { cssColor, cssToken, toHexColor } from "../lib/css-color.js";

/**
 * A library that paints with JavaScript (Monaco, xterm, a canvas, Mermaid)
 * gets a concrete colour, never var(--…): it cannot read one, and Monaco
 * threw on it and took the lesson page down.
 *
 * jsdom does not resolve var() in a computed `color`, a browser does: where
 * the browser's answer matters, getComputedStyle is stood in for with what a
 * browser computes.
 */

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.style.removeProperty("--font-mono");
  document.body.innerHTML = "";
});

/** What a browser computes for the probe: its colour, and the tokens it inherits. */
function browserComputes(color: string, tokens: Record<string, string>): HTMLElement[] {
  const probed: HTMLElement[] = [];
  vi.spyOn(globalThis, "getComputedStyle").mockImplementation((element: Element) => {
    if (element instanceof HTMLElement) probed.push(element);
    // SAFETY: cssColor reads `color` and getPropertyValue, all this stands in for.
    return {
      color,
      getPropertyValue: (name: string) => tokens[name] ?? "",
    } as unknown as CSSStyleDeclaration;
  });
  return probed;
}

describe("toHexColor", () => {
  it.each([
    ["#0AFFD4", "#0affd4"],
    ["#0af", "#00aaff"],
    ["#0af8", "#00aaff88"],
    ["#2A256088", "#2a256088"],
    ["#2a2560ff", "#2a2560"],
    ["rgb(10, 255, 212)", "#0affd4"],
    ["rgba(42, 37, 96, 0.5)", "#2a256080"],
    ["rgba(42, 37, 96, 1)", "#2a2560"],
    ["rgb(10 255 212 / 50%)", "#0affd480"],
    ["rgba(0, 0, 0, 0)", "#00000000"],
    ["color(srgb 0.0392 1 0.8314)", "#0affd4"],
    ["color(srgb 0.0392 1 0.8314 / 0.08)", "#0affd414"],
  ])("reads %s as %s", (css, hex) => {
    expect(toHexColor(css)).toBe(hex);
  });

  it.each([
    "var(--color-bg-elevated)",
    "color-mix(in srgb, #0affd4 8%, transparent)",
    "color(display-p3 0 1 0.8)",
    "oklch(0.9 0.2 170)",
    "turquoise",
    "#12345",
    "rgb(10, 255)",
    "",
  ])("cannot read %s", (css) => {
    expect(toHexColor(css)).toBeNull();
  });
});

describe("cssColor", () => {
  it("is the fallback on the server", () => {
    vi.stubGlobal("document", undefined);
    expect(cssColor("--color-bg-elevated", "#0A0826")).toBe("#0A0826");
  });

  it("turns what the browser computed into hex, nested var() already resolved", () => {
    // --cosmetic-accent is var(--color-brand-turquoise): the browser resolves it.
    browserComputes("rgb(10, 255, 212)", { "--cosmetic-accent": "#0affd4" });
    expect(cssColor("--cosmetic-accent", "#000000")).toBe("#0affd4");
  });

  it("keeps a translucent colour's alpha", () => {
    browserComputes("rgba(42, 37, 96, 0.53)", { "--selection": "rgba(42,37,96,0.53)" });
    expect(cssColor("--selection", "#2A2560")).toBe("#2a256087");
  });

  it("is the fallback for an undefined token, not the colour the probe inherits", () => {
    browserComputes("rgb(184, 181, 209)", {});
    expect(cssColor("--absent", "#0A0826")).toBe("#0A0826");
  });

  it("is the fallback for a colour it cannot turn into hex", () => {
    browserComputes("oklch(0.9 0.2 170)", { "--accent": "oklch(0.9 0.2 170)" });
    expect(cssColor("--accent", "#0AFFD4")).toBe("#0AFFD4");
  });

  it("never hands back a var(), even where nothing resolves it (jsdom)", () => {
    document.documentElement.style.setProperty("--color-bg-elevated", "#0a0826");
    const value = cssColor("--color-bg-elevated", "#0A0826");
    expect(value).not.toContain("var(");
    expect(value).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/i);
    document.documentElement.style.removeProperty("--color-bg-elevated");
  });

  it("reads under the scope it is given, where the equipped cosmetics are, and leaves nothing behind", () => {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-accent", "accent-magenta");
    const frame = document.createElement("div");
    wrapper.appendChild(frame);
    document.body.appendChild(wrapper);
    const probed = browserComputes("rgb(255, 77, 210)", { "--cosmetic-accent": "#ff4dd2" });

    expect(cssColor("--cosmetic-accent", "#0AFFD4", frame)).toBe("#ff4dd2");
    expect(probed).toHaveLength(1);
    expect(probed[0]?.style.getPropertyValue("color")).toBe("var(--cosmetic-accent)");
    // Removed once read: the probe was in the frame, and is no longer.
    expect(frame.childElementCount).toBe(0);
    expect(probed[0]?.isConnected).toBe(false);
  });
});

describe("cssToken", () => {
  it("reads a token as written, for a value that is not a colour, and falls back without one", () => {
    document.documentElement.style.setProperty("--font-mono", "JetBrains Mono");
    expect(cssToken("--font-mono", "")).toBe("JetBrains Mono");
    expect(cssToken("--absent", "monospace")).toBe("monospace");
  });

  it("is the fallback on the server", () => {
    vi.stubGlobal("document", undefined);
    expect(cssToken("--font-mono", "monospace")).toBe("monospace");
  });
});
