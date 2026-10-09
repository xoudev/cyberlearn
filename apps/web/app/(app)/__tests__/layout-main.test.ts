import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The shell's <main> grows with its page and the window scrolls. With
 * overflow-y-auto on it, it was a scroll container all the same, one that
 * never scrolled: every sticky element of every page measured itself against
 * it, and none of them ever stuck. The layout is an async server component
 * behind auth, so its markup is read rather than rendered.
 */

const LAYOUT = readFileSync(path.resolve(__dirname, "../layout.tsx"), "utf8");

/** Tailwind utilities that make a box a scroll container. */
const SCROLL_CONTAINER = /\boverflow(?:-[xy])?-(?:auto|scroll|hidden)\b/;

function mainClassName(source: string): string {
  const match = /<main\b[^>]*\bclassName="([^"]*)"/.exec(source);
  if (match?.[1] === undefined) throw new Error("no <main className> in the app layout");
  return match[1];
}

describe("the app shell's <main>", () => {
  it("is not a scroll container, so a page's sticky elements follow the window", () => {
    expect(mainClassName(LAYOUT)).not.toMatch(SCROLL_CONTAINER);
  });

  it("still clips what a page lets out sideways, with clip rather than hidden", () => {
    expect(mainClassName(LAYOUT).split(" ")).toContain("overflow-x-clip");
  });

  it("recognises the classes it guards against", () => {
    expect("flex flex-1 flex-col overflow-y-auto").toMatch(SCROLL_CONTAINER);
    expect("overflow-hidden").toMatch(SCROLL_CONTAINER);
    expect("overflow-x-scroll").toMatch(SCROLL_CONTAINER);
    expect("flex flex-1 flex-col overflow-x-clip").not.toMatch(SCROLL_CONTAINER);
  });
});
