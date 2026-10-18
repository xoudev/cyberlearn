/**
 * A line diff, to show what updating a lesson from its file would change.
 *
 * Longest common subsequence over lines. The lines both texts open and close
 * with are set aside first: an edit touches a few lines of a lesson, and only
 * the stretch between them goes through the quadratic table. That stretch is
 * compared line by line up to MAX_COMPARED_CELLS cells. Beyond, which only a
 * file rewritten from top to bottom reaches (the import takes files up to
 * 500 KB, some 17 000 lines), it is given as removed, then added, and the
 * passages are not shown: the table would take gigabytes.
 *
 * The shapes are @cyberlearn/types', where the import's result names them.
 */

import type { LessonDiffHunk, LessonDiffLine } from "@cyberlearn/types";

export type DiffLine = LessonDiffLine;
export type DiffHunk = LessonDiffHunk;

export function splitLines(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, "\n");
  return normalized === "" ? [] : normalized.split("\n");
}

/**
 * Cells of the table beyond which the changed stretch is not compared line by
 * line: 16 MB of Uint32Array, a few milliseconds. Two stretches of 2 000 lines.
 */
export const MAX_COMPARED_CELLS = 4_000_000;

/** A diff, and whether its changed stretch was compared line by line. */
export interface LineDiff {
  lines: DiffLine[];
  /**
   * False when the changed stretch was too long to compare: it is then all
   * removed, then all added, so the counts are what it spans, at most.
   */
  exact: boolean;
}

/** Every line of both texts, in order, marked same, removed or added. */
export function compareLines(before: string, after: string): LineDiff {
  const a = splitLines(before);
  const b = splitLines(after);

  // What both texts open and close with.
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  ) {
    tail++;
  }

  const out: DiffLine[] = [];
  for (let k = 0; k < head; k++)
    out.push({ kind: "same", text: a[k] ?? "", before: k + 1, after: k + 1 });

  // The stretch in between: a[head..head + n), b[head..head + m).
  const n = a.length - head - tail;
  const m = b.length - head - tail;
  const exact = n * m <= MAX_COMPARED_CELLS;
  let i = 0;
  let j = 0;
  if (exact && n > 0 && m > 0) {
    // lcs[x * (m + 1) + y]: length of the common subsequence of the stretch's a[x..] and b[y..].
    const lcs = new Uint32Array((n + 1) * (m + 1));
    for (let x = n - 1; x >= 0; x--) {
      for (let y = m - 1; y >= 0; y--) {
        lcs[x * (m + 1) + y] =
          a[head + x] === b[head + y]
            ? (lcs[(x + 1) * (m + 1) + y + 1] ?? 0) + 1
            : Math.max(lcs[(x + 1) * (m + 1) + y] ?? 0, lcs[x * (m + 1) + y + 1] ?? 0);
      }
    }
    while (i < n && j < m) {
      if (a[head + i] === b[head + j]) {
        out.push({
          kind: "same",
          text: a[head + i] ?? "",
          before: head + i + 1,
          after: head + j + 1,
        });
        i++;
        j++;
      } else if ((lcs[(i + 1) * (m + 1) + j] ?? 0) >= (lcs[i * (m + 1) + j + 1] ?? 0)) {
        out.push({ kind: "removed", text: a[head + i] ?? "", before: head + i + 1 });
        i++;
      } else {
        out.push({ kind: "added", text: b[head + j] ?? "", after: head + j + 1 });
        j++;
      }
    }
  }
  for (; i < n; i++) out.push({ kind: "removed", text: a[head + i] ?? "", before: head + i + 1 });
  for (; j < m; j++) out.push({ kind: "added", text: b[head + j] ?? "", after: head + j + 1 });

  for (let k = 0; k < tail; k++) {
    out.push({
      kind: "same",
      text: a[head + n + k] ?? "",
      before: head + n + k + 1,
      after: head + m + k + 1,
    });
  }
  return { lines: out, exact };
}

/** Every line of both texts, in order, marked same, removed or added. */
export function diffLines(before: string, after: string): DiffLine[] {
  return compareLines(before, after).lines;
}

/** The changes of a diff with `context` unchanged lines around each, as hunks. */
export function diffHunks(lines: readonly DiffLine[], context = 2): DiffHunk[] {
  const changed = lines.flatMap((l, idx) => (l.kind === "same" ? [] : [idx]));
  if (changed.length === 0) return [];

  // Ranges of line indices to show, merged when their context touches.
  const ranges: [number, number][] = [];
  for (const idx of changed) {
    const start = Math.max(0, idx - context);
    const end = Math.min(lines.length - 1, idx + context);
    const last = ranges[ranges.length - 1];
    if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end);
    else ranges.push([start, end]);
  }

  return ranges.map(([start, end]) => {
    const slice = lines.slice(start, end + 1);
    return {
      beforeStart: firstLine(lines, start, "before"),
      afterStart: firstLine(lines, start, "after"),
      lines: slice,
    };
  });
}

/** The line number a hunk starting at `idx` opens on, on one side. */
function firstLine(lines: readonly DiffLine[], idx: number, side: "before" | "after"): number {
  for (let k = idx; k < lines.length; k++) {
    const l = lines[k];
    if (!l) break;
    if (side === "before" && l.kind !== "added") return l.before;
    if (side === "after" && l.kind !== "removed") return l.after;
  }
  // Only additions (or only removals) from here on: the line after the last one before.
  for (let k = idx - 1; k >= 0; k--) {
    const l = lines[k];
    if (!l) break;
    if (side === "before" && l.kind !== "added") return l.before + 1;
    if (side === "after" && l.kind !== "removed") return l.after + 1;
  }
  return 1;
}

/** How many lines a diff removes and adds. */
export function diffStats(lines: readonly DiffLine[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const l of lines) {
    if (l.kind === "added") added++;
    else if (l.kind === "removed") removed++;
  }
  return { added, removed };
}
