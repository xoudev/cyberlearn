import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * AGENTS.md, rule 2: an `as` cast carries a comment that justifies it. The
 * app's replies are read as JSON from its own routes, and a cast there is
 * only as good as the sentence that says whose JSON it is, so each one is
 * checked here rather than by eye: ESLint does not ask for a comment.
 */

const API = fileURLToPath(new URL("../api.ts", import.meta.url));
const lines = readFileSync(API, "utf8").split("\n");

/** The comment block right above a line, as its text. */
function commentAbove(index: number): string {
  const block: string[] = [];
  for (let i = index - 1; i >= 0; i--) {
    const line = (lines[i] ?? "").trim();
    if (!line.startsWith("//")) break;
    block.unshift(line);
  }
  return block.join("\n");
}

describe("the casts on the routes' replies in lib/api.ts", () => {
  const casts = lines
    .map((text, index) => ({ text, index }))
    .filter(({ text }) => /\.json\(\)\)\s+as\b/u.test(text));

  it("finds the casts it is meant to check", () => {
    // If the app reads its replies another way one day, this guard has done its job and goes.
    expect(casts.length).toBeGreaterThan(40);
  });

  it("justifies every one with a SAFETY comment right above it", () => {
    const bare = casts
      .filter(({ index }) => !/\bSAFETY:/u.test(commentAbove(index)))
      .map(({ text, index }) => `line ${String(index + 1)}: ${text.trim()}`);
    expect(bare).toEqual([]);
  });

  it("names the route whose JSON it is", () => {
    const unnamed = casts
      .filter(({ index }) => !commentAbove(index).includes("apps/web/app/api/mobile/"))
      .map(({ text, index }) => `line ${String(index + 1)}: ${text.trim()}`);
    expect(unnamed).toEqual([]);
  });
});
