/**
 * A line diff, to show what updating a lesson from its file would change.
 *
 * Longest common subsequence over lines. Lessons run to a few hundred lines,
 * so the quadratic table stays small (a 600-line lesson against itself is
 * 360 000 cells), and no dependency is needed for it.
 */

export type DiffLine =
  | { kind: "same"; text: string; before: number; after: number }
  | { kind: "removed"; text: string; before: number }
  | { kind: "added"; text: string; after: number };

export interface DiffHunk {
  /** 1-based first line of the hunk in the old and new text. */
  beforeStart: number;
  afterStart: number;
  lines: DiffLine[];
}

export function splitLines(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, "\n");
  return normalized === "" ? [] : normalized.split("\n");
}

/** Every line of both texts, in order, marked same, removed or added. */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = splitLines(before);
  const b = splitLines(after);
  const n = a.length;
  const m = b.length;
  // lcs[i * (m + 1) + j]: length of the common subsequence of a[i..] and b[j..].
  const lcs = new Uint32Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * (m + 1) + j] =
        a[i] === b[j]
          ? (lcs[(i + 1) * (m + 1) + j + 1] ?? 0) + 1
          : Math.max(lcs[(i + 1) * (m + 1) + j] ?? 0, lcs[i * (m + 1) + j + 1] ?? 0);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ kind: "same", text: a[i] ?? "", before: i + 1, after: j + 1 });
      i++;
      j++;
    } else if ((lcs[(i + 1) * (m + 1) + j] ?? 0) >= (lcs[i * (m + 1) + j + 1] ?? 0)) {
      out.push({ kind: "removed", text: a[i] ?? "", before: i + 1 });
      i++;
    } else {
      out.push({ kind: "added", text: b[j] ?? "", after: j + 1 });
      j++;
    }
  }
  for (; i < n; i++) out.push({ kind: "removed", text: a[i] ?? "", before: i + 1 });
  for (; j < m; j++) out.push({ kind: "added", text: b[j] ?? "", after: j + 1 });
  return out;
}

/** The changes with `context` unchanged lines around each, as hunks. */
export function diffHunks(before: string, after: string, context = 2): DiffHunk[] {
  const lines = diffLines(before, after);
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
function firstLine(lines: DiffLine[], idx: number, side: "before" | "after"): number {
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
