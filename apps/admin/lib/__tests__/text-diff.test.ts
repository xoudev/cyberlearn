import { describe, expect, it } from "vitest";
import { diffHunks, diffLines, diffStats, splitLines } from "../text-diff";

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

  it("treats Windows line endings as the same lines", () => {
    expect(diffStats(diffLines("a\r\nb", "a\nb"))).toEqual({ added: 0, removed: 0 });
  });

  it("handles one side empty", () => {
    expect(diffStats(diffLines("", "a\nb"))).toEqual({ added: 2, removed: 0 });
    expect(diffStats(diffLines("a", ""))).toEqual({ added: 0, removed: 1 });
    expect(splitLines("")).toEqual([]);
  });
});

describe("diffHunks", () => {
  const before = Array.from({ length: 20 }, (_, i) => `ligne ${String(i + 1)}`).join("\n");

  it("returns no hunk for equal texts", () => {
    expect(diffHunks(before, before)).toEqual([]);
  });

  it("shows each change with its context, and where it starts", () => {
    const after = before.replace("ligne 10", "ligne dix");
    const [hunk, ...rest] = diffHunks(before, after, 2);
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
    expect(diffHunks(before, far, 2)).toHaveLength(2);
    const near = before.replace("ligne 5\n", "ligne cinq\n").replace("ligne 8\n", "ligne huit\n");
    expect(diffHunks(before, near, 2)).toHaveLength(1);
  });

  it("numbers a hunk that only adds at the end", () => {
    const [hunk] = diffHunks("a\nb", "a\nb\nc", 1);
    expect(hunk?.afterStart).toBe(2);
    expect(hunk?.lines.at(-1)).toEqual({ kind: "added", text: "c", after: 3 });
  });
});
