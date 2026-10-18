import { describe, expect, it } from "vitest";
import { offsetOfLine } from "../text-position";

const TEXT = "---\nrefCode: X\n---\n\n## Titre";

describe("offsetOfLine", () => {
  it("finds the start of a line, and a column on it", () => {
    expect(offsetOfLine(TEXT, 1)).toBe(0);
    expect(offsetOfLine(TEXT, 2)).toBe(4);
    expect(TEXT.slice(offsetOfLine(TEXT, 2, 10))).toMatch(/^X/);
    expect(TEXT.slice(offsetOfLine(TEXT, 5, 4))).toBe("Titre");
  });

  it("stays on the line when the column runs past it", () => {
    expect(offsetOfLine(TEXT, 2, 99)).toBe(TEXT.indexOf("\n---"));
  });

  it("lands at the end for a line past the last", () => {
    expect(offsetOfLine(TEXT, 40)).toBe(TEXT.length);
  });
});
