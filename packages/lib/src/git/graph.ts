import { ancestors, type GitState } from "./sandbox";

/**
 * The branch graph of a <GitSandbox>, laid out once for both renderers: the
 * site draws it in SVG, the app with react-native-svg, from the same rows and
 * the same path strings. Newest commit on top, one lane per line of work, as
 * `git log --graph` lays it out: a branch keeps its lane, a merge brings a
 * second lane back into the first.
 */

export interface GraphGeometry {
  readonly rowHeight: number;
  readonly laneWidth: number;
  readonly padding: number;
}

export const DEFAULT_GEOMETRY: GraphGeometry = { rowHeight: 30, laneWidth: 20, padding: 12 };

export interface GraphRow {
  readonly id: string;
  readonly message: string;
  readonly lane: number;
  readonly x: number;
  readonly y: number;
  /** The branches pointing here, HEAD's first. */
  readonly branches: readonly string[];
  readonly head: boolean;
  readonly merge: boolean;
}

export interface GraphEdge {
  /** An SVG path, from the child down to its parent. */
  readonly d: string;
  readonly lane: number;
}

export interface GraphLayout {
  readonly rows: readonly GraphRow[];
  readonly edges: readonly GraphEdge[];
  readonly lanes: number;
  /** The width of the lanes (labels go to the right of it), and the height. */
  readonly width: number;
  readonly height: number;
}

/** An SVG path command and its numbers: "M 12 12", " C ...". */
function step(command: string, ...numbers: number[]): string {
  return [command, ...numbers.map(String)].join(" ");
}

function curve(x1: number, y1: number, x2: number, y2: number): string {
  const mid = (y1 + y2) / 2;
  return step(" C", x1, mid, x2, mid, x2, y2);
}

export function layoutGraph(
  state: GitState,
  geometry: GraphGeometry = DEFAULT_GEOMETRY,
): GraphLayout {
  const { rowHeight, laneWidth, padding } = geometry;
  const reachable = new Set<string>();
  for (const tip of state.branches.values()) {
    for (const id of ancestors(state, tip)) reachable.add(id);
  }
  const commits = [...reachable]
    .map((id) => state.commits.get(id))
    .filter((c) => c !== undefined)
    .sort((a, b) => b.order - a.order);

  // Each lane holds the commit it waits for, or null when free.
  const lanes: (string | null)[] = [];
  const takeLane = (): number => {
    const free = lanes.indexOf(null);
    if (free !== -1) return free;
    lanes.push(null);
    return lanes.length - 1;
  };
  const place = new Map<string, { row: number; lane: number }>();
  const pending: { child: string; parent: string; lane: number }[] = [];

  commits.forEach((commit, row) => {
    let lane = lanes.indexOf(commit.id);
    if (lane === -1) lane = takeLane();
    for (let i = 0; i < lanes.length; i++) if (lanes[i] === commit.id) lanes[i] = null;
    place.set(commit.id, { row, lane });
    commit.parents.forEach((parent, i) => {
      if (!reachable.has(parent)) return;
      let travel: number;
      if (i === 0) {
        travel = lane;
      } else {
        travel = lanes.indexOf(parent);
        if (travel === -1) travel = takeLane();
      }
      lanes[travel] = parent;
      pending.push({ child: commit.id, parent, lane: travel });
    });
  });

  const x = (lane: number): number => padding + lane * laneWidth;
  const y = (row: number): number => padding + row * rowHeight;
  const edges: GraphEdge[] = [];
  for (const edge of pending) {
    const from = place.get(edge.child);
    const to = place.get(edge.parent);
    if (!from || !to) continue;
    const x1 = x(from.lane);
    const y1 = y(from.row);
    const xe = x(edge.lane);
    const x2 = x(to.lane);
    const y2 = y(to.row);
    let d = step("M", x1, y1);
    let at = y1;
    if (edge.lane !== from.lane) {
      at = Math.min(y1 + rowHeight, y2);
      d += curve(x1, y1, xe, at);
    }
    const end = edge.lane !== to.lane ? y2 - rowHeight : y2;
    if (end > at) {
      d += step(" L", xe, end);
      at = end;
    }
    if (edge.lane !== to.lane || at < y2) d += curve(xe, at, x2, y2);
    edges.push({ d, lane: edge.lane });
  }

  const headId = state.branches.get(state.head);
  const rows: GraphRow[] = commits.map((commit) => {
    const at = place.get(commit.id) ?? { row: 0, lane: 0 };
    const names = [...state.branches.entries()]
      .filter(([name, id]) => id === commit.id && name !== state.head)
      .map(([name]) => name)
      .sort();
    if (headId === commit.id) names.unshift(state.head);
    return {
      id: commit.id,
      message: commit.message.split("\n")[0] ?? "",
      lane: at.lane,
      x: x(at.lane),
      y: y(at.row),
      branches: names,
      head: headId === commit.id,
      merge: commit.parents.length > 1,
    };
  });
  const used = rows.reduce((max, r) => Math.max(max, r.lane + 1), 1);
  return {
    rows,
    edges,
    lanes: used,
    width: padding * 2 + (used - 1) * laneWidth,
    height: rows.length === 0 ? 0 : padding * 2 + (rows.length - 1) * rowHeight,
  };
}
