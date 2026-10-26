import { describe, expect, it } from "vitest";
import {
  compareLines,
  diffHunks,
  diffLines,
  diffStats,
  MAX_COMPARED_CELLS,
  splitLines,
} from "../text-diff";

describe("diffLines", () => {
  it("marks nothing when the texts are equal", () => {
    expect(diffLines("a\nb", "a\nb").every((l) => l.kind === "same")).toBe(true);
  });

  it("finds a changed line as one removal and one addition", () => {
    const lines = diffLines("un\ndeux ; trois\nquatre", "un\ndeux, trois\nquatre");
    expect(lines.map((l) => l.kind)).toEqual(["same", "removed", "added", "same"]);
    expect(diffStats(lines)).toEqual({ added: 1, removed: 1 });
  });

  it("keeps line numbers of both sides", () => {
    const lines = diffLines("a\nb\nc", "a\nx\nb\nc");
    expect(lines).toEqual([
      { kind: "same", text: "a", before: 1, after: 1 },
      { kind: "added", text: "x", after: 2 },
      { kind: "same", text: "b", before: 2, after: 3 },
      { kind: "same", text: "c", before: 3, after: 4 },
    ]);
  });

  it("finds the same changes with the opening and closing lines set aside", () => {
    // A repeated line on the edge of the change: each side keeps its numbers.
    expect(diffLines("a\nb\nb\nc", "a\nb\nc")).toEqual([
      { kind: "same", text: "a", before: 1, after: 1 },
      { kind: "same", text: "b", before: 2, after: 2 },
      { kind: "removed", text: "b", before: 3 },
      { kind: "same", text: "c", before: 4, after: 3 },
    ]);
    expect(diffLines("x\na\ny", "x\nb\nc\ny").map((l) => l.kind)).toEqual([
      "same",
      "removed",
      "added",
      "added",
      "same",
    ]);
  });

  it("treats Windows line endings as the same lines", () => {
    expect(diffStats(diffLines("a\r\nb", "a\nb"))).toEqual({ added: 0, removed: 0 });
  });

  it("handles one side empty", () => {
    expect(diffStats(diffLines("", "a\nb"))).toEqual({ added: 2, removed: 0 });
    expect(diffStats(diffLines("a", ""))).toEqual({ added: 0, removed: 1 });
    expect(splitLines("")).toEqual([]);
  });
});

describe("compareLines on a long file", () => {
  const long = (prefix: string, count: number): string =>
    Array.from({ length: count }, (_, i) => `${prefix} ${String(i)}`).join("\n");

  it("compares a few changed lines of a long lesson line by line", () => {
    const before = long("ligne", 20_000);
    const after = before.replace("ligne 9999\n", "ligne neuf mille\n");
    const diff = compareLines(before, after);
    expect(diff.exact).toBe(true);
    expect(diffStats(diff.lines)).toEqual({ added: 1, removed: 1 });
    expect(diffHunks(diff.lines, 1)[0]?.beforeStart).toBe(9_999);
  });

  it("gives a stretch too long to compare as removed then added, the counts at most", () => {
    const side = Math.ceil(Math.sqrt(MAX_COMPARED_CELLS)) + 1;
    const diff = compareLines(
      `titre\n${long("avant", side)}\nfin`,
      `titre\n${long("après", side)}\nfin`,
    );
    expect(diff.exact).toBe(false);
    expect(diffStats(diff.lines)).toEqual({ added: side, removed: side });
    expect(diff.lines[0]).toEqual({ kind: "same", text: "titre", before: 1, after: 1 });
    expect(diff.lines.at(-1)).toEqual({
      kind: "same",
      text: "fin",
      before: side + 2,
      after: side + 2,
    });
  });
});

describe("diffHunks", () => {
  const before = Array.from({ length: 20 }, (_, i) => `ligne ${String(i + 1)}`).join("\n");

  it("returns no hunk for equal texts", () => {
    expect(diffHunks(diffLines(before, before))).toEqual([]);
  });

  it("shows each change with its context, and where it starts", () => {
    const after = before.replace("ligne 10", "ligne dix");
    const [hunk, ...rest] = diffHunks(diffLines(before, after), 2);
    expect(rest).toEqual([]);
    expect(hunk?.beforeStart).toBe(8);
    expect(hunk?.afterStart).toBe(8);
    expect(hunk?.lines.map((l) => l.text)).toEqual([
      "ligne 8",
      "ligne 9",
      "ligne 10",
      "ligne dix",
      "ligne 11",
      "ligne 12",
    ]);
  });

  it("keeps distant changes apart and merges close ones", () => {
    const far = before.replace("ligne 2\n", "ligne deux\n").replace("ligne 18", "ligne 18 bis");
    expect(diffHunks(diffLines(before, far), 2)).toHaveLength(2);
    const near = before.replace("ligne 5\n", "ligne cinq\n").replace("ligne 8\n", "ligne huit\n");
    expect(diffHunks(diffLines(before, near), 2)).toHaveLength(1);
  });

  it("numbers a hunk that only adds at the end", () => {
    const [hunk] = diffHunks(diffLines("a\nb", "a\nb\nc"), 1);
    expect(hunk?.afterStart).toBe(2);
    expect(hunk?.lines.at(-1)).toEqual({ kind: "added", text: "c", after: 3 });
  });
});
