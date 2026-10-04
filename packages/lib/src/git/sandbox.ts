/**
 * A Git repository simulated in memory, for the lessons' <GitSandbox>: the
 * same engine runs on the site and in the app, so a lesson plays the same on
 * both. It knows the commands of the Git lessons (init, status, add, rm,
 * commit, log, diff, branch, switch, checkout, merge, rebase, reset, restore)
 * and a few shell commands to write files (echo with > and >>, cat, ls,
 * touch, rm). Git's own messages stay in English, as the learner will meet
 * them in a real terminal; what only this sandbox refuses is said in French.
 *
 * Every function here is pure: `run` takes a state and a command line and
 * returns the next state with the output. A commit id is a hash of what the
 * commit holds, so the same commands give the same ids, on every device.
 */

export type Tree = ReadonlyMap<string, string>;

export interface GitCommit {
  readonly id: string;
  readonly message: string;
  readonly parents: readonly string[];
  readonly tree: Tree;
  /** Creation order: a parent always comes before its children. */
  readonly order: number;
}

export interface MergeInProgress {
  /** The name merged, as written in the conflict markers. */
  readonly name: string;
  readonly theirs: string;
  /** The paths still in conflict; `git add` marks one resolved. */
  readonly conflicts: readonly string[];
}

export interface GitState {
  readonly initialized: boolean;
  readonly commits: ReadonlyMap<string, GitCommit>;
  readonly branches: ReadonlyMap<string, string>;
  /** Every branch that has existed: a check can then tell one deleted from one never made. */
  readonly known: ReadonlySet<string>;
  /** The branch HEAD is on; it has no commit yet right after `git init`. */
  readonly head: string;
  readonly index: Tree;
  readonly worktree: Tree;
  readonly merging: MergeInProgress | null;
  readonly counter: number;
}

export interface GitRun {
  readonly state: GitState;
  readonly output: string;
  readonly ok: boolean;
}

export const SANDBOX_DIR = "/home/toi/projet";
const MAX_COMMITS = 300;
const MAX_FILES = 100;
const MAX_FILE_LENGTH = 20_000;

export const EMPTY_STATE: GitState = {
  initialized: false,
  commits: new Map(),
  branches: new Map(),
  known: new Set(),
  head: "main",
  index: new Map(),
  worktree: new Map(),
  merging: null,
  counter: 0,
};

/** The state being changed by one command: copies of the parts that change. */
interface Draft {
  initialized: boolean;
  commits: Map<string, GitCommit>;
  branches: Map<string, string>;
  known: Set<string>;
  head: string;
  index: Map<string, string>;
  worktree: Map<string, string>;
  merging: MergeInProgress | null;
  counter: number;
}

/** A command that fails: its changes are dropped, and the && chain stops. */
class Failure extends Error {}

function fail(message: string): never {
  throw new Failure(message);
}

/**
 * A command that ends in error but keeps what it did, as a merge that stops on
 * a conflict: the files hold the markers, and the chain stops there.
 */
class Halt {
  constructor(readonly output: string) {}
}

// --- Reading the command line -------------------------------------------------

interface Token {
  readonly text: string;
  /** An operator written bare (>, >>, &&), not inside quotes. */
  readonly op: boolean;
}

/** Splits a line as a shell would: quotes keep spaces, > >> && stand apart. */
export function tokenize(line: string): Token[] | null {
  const tokens: Token[] = [];
  let current = "";
  let started = false;
  let quote: '"' | "'" | null = null;
  const flush = (): void => {
    if (started) tokens.push({ text: current, op: false });
    current = "";
    started = false;
  };
  for (let i = 0; i < line.length; i++) {
    const ch = line.charAt(i);
    if (quote !== null) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
    } else if (ch === " " || ch === "\t") {
      flush();
    } else if (ch === ">") {
      flush();
      const double = line.charAt(i + 1) === ">";
      tokens.push({ text: double ? ">>" : ">", op: true });
      if (double) i++;
    } else if (ch === "&" && line.charAt(i + 1) === "&") {
      flush();
      tokens.push({ text: "&&", op: true });
      i++;
    } else {
      current += ch;
      started = true;
    }
  }
  if (quote !== null) return null;
  flush();
  return tokens;
}

function validPath(path: string): boolean {
  if (!/^[A-Za-z0-9._-][A-Za-z0-9._/-]{0,79}$/u.test(path)) return false;
  const parts = path.split("/");
  return parts.every((p) => p !== "" && p !== "." && p !== "..") && parts[0] !== ".git";
}

function checkPath(command: string, path: string): string {
  const clean = path.startsWith("./") ? path.slice(2) : path;
  if (clean === ".git" || clean.startsWith(".git/")) {
    fail(`${command}: le dossier .git est tenu par Git lui-même, pas à la main.`);
  }
  if (!validPath(clean)) fail(`${command}: nom de fichier refusé dans ce bac à sable : ${path}`);
  return clean;
}

/** Whether a pathspec (a file, a folder, or ".") covers a path. */
function covers(spec: string, path: string): boolean {
  const clean = spec.replace(/^\.\//u, "").replace(/\/+$/u, "");
  return clean === "." || clean === "" || path === clean || path.startsWith(`${clean}/`);
}

// --- Commits, references, history ---------------------------------------------

/** FNV-1a, 32 bits, as 8 hex digits: enough to name the commits of a lesson. */
function fnv(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function treeKey(tree: Tree): string {
  return [...tree.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([path, content]) => `${path}\u0000${content}`)
    .join("\u0001");
}

function newCommit(
  draft: Draft,
  message: string,
  parents: readonly string[],
  tree: Tree,
): GitCommit {
  if (draft.commits.size >= MAX_COMMITS) {
    fail(
      `Ce bac à sable s'arrête à ${String(MAX_COMMITS)} commits : réinitialise-le pour repartir.`,
    );
  }
  const seed = `${message}\u0002${parents.join(",")}\u0002${treeKey(tree)}`;
  let n = draft.counter;
  let id = fnv(`${String(n)}:${seed}`).slice(0, 7);
  while (draft.commits.has(id)) {
    n++;
    id = fnv(`${String(n)}:${seed}`).slice(0, 7);
  }
  draft.counter = n + 1;
  const commit: GitCommit = { id, message, parents, tree: new Map(tree), order: draft.counter };
  draft.commits.set(id, commit);
  return commit;
}

export function headCommit(state: GitState | Draft): GitCommit | undefined {
  const id = state.branches.get(state.head);
  return id === undefined ? undefined : state.commits.get(id);
}

function headTree(state: GitState | Draft): Tree {
  return headCommit(state)?.tree ?? new Map<string, string>();
}

/** HEAD, a branch, a commit id (4 characters or more), each with ~N or ^. */
export function resolveRef(state: GitState | Draft, ref: string): GitCommit | undefined {
  let cut = ref.length;
  for (let i = 0; i < ref.length; i++) {
    if (ref.charAt(i) === "~" || ref.charAt(i) === "^") {
      cut = i;
      break;
    }
  }
  const base = ref.slice(0, cut);
  let commit: GitCommit | undefined;
  if (base === "HEAD" || base === "@") {
    commit = headCommit(state);
  } else if (state.branches.has(base)) {
    commit = state.commits.get(state.branches.get(base) ?? "");
  } else if (/^[0-9a-f]{4,7}$/u.test(base)) {
    const found = [...state.commits.keys()].filter((id) => id.startsWith(base));
    commit = found.length === 1 ? state.commits.get(found[0] ?? "") : undefined;
  }
  let rest = ref.slice(cut);
  while (commit !== undefined && rest !== "") {
    const step = /^(~(\d*)|\^)/u.exec(rest);
    if (!step) return undefined;
    const times = step[1] === "^" ? 1 : step[2] === "" ? 1 : Number(step[2]);
    for (let i = 0; i < times && commit !== undefined; i++) {
      const parent: string | undefined = commit.parents[0];
      commit = parent === undefined ? undefined : state.commits.get(parent);
    }
    rest = rest.slice(step[0].length);
  }
  return commit;
}

/** Every commit reachable from `id`, itself included. */
export function ancestors(state: GitState | Draft, id: string): Set<string> {
  const seen = new Set<string>();
  const stack = [id];
  while (stack.length > 0) {
    const next = stack.pop();
    if (next === undefined || seen.has(next)) continue;
    seen.add(next);
    for (const parent of state.commits.get(next)?.parents ?? []) stack.push(parent);
  }
  return seen;
}

/** The history of a commit, newest first (a child always before its parents). */
export function history(state: GitState | Draft, id: string): GitCommit[] {
  return [...ancestors(state, id)]
    .map((c) => state.commits.get(c))
    .filter((c): c is GitCommit => c !== undefined)
    .sort((a, b) => b.order - a.order);
}

function mergeBase(state: Draft, a: string, b: string): GitCommit | undefined {
  const fromA = ancestors(state, a);
  return history(state, b).find((c) => fromA.has(c.id));
}

function firstLine(message: string): string {
  return message.split("\n")[0] ?? "";
}

function changedPaths(a: Tree, b: Tree): string[] {
  const paths = new Set([...a.keys(), ...b.keys()]);
  return [...paths].filter((p) => a.get(p) !== b.get(p)).sort();
}

function filesChanged(n: number): string {
  return ` ${String(n)} file${n === 1 ? "" : "s"} changed`;
}

// --- Status ---------------------------------------------------------------------

export interface GitStatus {
  readonly staged: readonly { path: string; kind: "new file" | "modified" | "deleted" }[];
  readonly unstaged: readonly { path: string; kind: "modified" | "deleted" }[];
  readonly untracked: readonly string[];
  readonly unmerged: readonly string[];
}

export function statusOf(state: GitState | Draft): GitStatus {
  const head = headTree(state);
  const unmerged = state.merging?.conflicts ?? [];
  const staged = changedPaths(head, state.index)
    .filter((p) => !unmerged.includes(p))
    .map((path) => ({
      path,
      kind: !head.has(path)
        ? ("new file" as const)
        : state.index.has(path)
          ? ("modified" as const)
          : ("deleted" as const),
    }));
  const unstaged = [...state.index.keys()]
    .filter((p) => !unmerged.includes(p) && state.worktree.get(p) !== state.index.get(p))
    .sort()
    .map((path) => ({
      path,
      kind: state.worktree.has(path) ? ("modified" as const) : ("deleted" as const),
    }));
  const untracked = [...state.worktree.keys()]
    .filter((p) => !state.index.has(p) && !unmerged.includes(p))
    .sort();
  return { staged, unstaged, untracked, unmerged: [...unmerged].sort() };
}

/** Clean as Git says it: nothing staged, modified, untracked, nor half-merged. */
export function isClean(state: GitState): boolean {
  const s = statusOf(state);
  return (
    state.merging === null &&
    s.staged.length === 0 &&
    s.unstaged.length === 0 &&
    s.untracked.length === 0
  );
}

function statusText(state: Draft): string {
  const s = statusOf(state);
  const lines = [`On branch ${state.head}`];
  const born = headCommit(state) !== undefined;
  if (!born) lines.push("", "No commits yet");
  if (state.merging) {
    if (s.unmerged.length > 0) {
      lines.push(
        "You have unmerged paths.",
        '  (fix conflicts and run "git commit")',
        '  (use "git merge --abort" to abort the merge)',
      );
    } else {
      lines.push(
        "All conflicts fixed but you are still merging.",
        '  (use "git commit" to conclude merge)',
      );
    }
  }
  if (s.staged.length > 0) {
    lines.push("", "Changes to be committed:");
    lines.push(
      born
        ? '  (use "git restore --staged <file>..." to unstage)'
        : '  (use "git rm --cached <file>..." to unstage)',
    );
    for (const f of s.staged) lines.push(`\t${`${f.kind}:`.padEnd(12)}${f.path}`);
  }
  if (s.unmerged.length > 0) {
    lines.push("", "Unmerged paths:", '  (use "git add <file>..." to mark resolution)');
    for (const p of s.unmerged) lines.push(`\tboth modified:   ${p}`);
  }
  if (s.unstaged.length > 0) {
    lines.push(
      "",
      "Changes not staged for commit:",
      '  (use "git add <file>..." to update what will be committed)',
      '  (use "git restore <file>..." to discard changes in working directory)',
    );
    for (const f of s.unstaged) lines.push(`\t${`${f.kind}:`.padEnd(12)}${f.path}`);
  }
  if (s.untracked.length > 0) {
    lines.push(
      "",
      "Untracked files:",
      '  (use "git add <file>..." to include in what will be committed)',
    );
    for (const p of s.untracked) lines.push(`\t${p}`);
  }
  if (lines.length > 1) lines.push("");
  const settled = s.staged.length === 0 && s.unmerged.length === 0;
  if (!settled) {
    return lines.join("\n").replace(/\n+$/u, "");
  }
  if (s.unstaged.length > 0) {
    lines.push('no changes added to commit (use "git add" and/or "git commit -a")');
  } else if (s.untracked.length > 0) {
    lines.push('nothing added to commit but untracked files present (use "git add" to track)');
  } else if (!born) {
    lines.push('nothing to commit (create/copy files and use "git add" to track)');
  } else if (!state.merging) {
    lines.push("nothing to commit, working tree clean");
  }
  return lines.join("\n").replace(/\n+$/u, "");
}

// --- Diff -----------------------------------------------------------------------

function lines(text: string | undefined): string[] {
  if (text === undefined || text === "") return [];
  const parts = text.split("\n");
  if (parts[parts.length - 1] === "") parts.pop();
  return parts;
}

/** A line diff by longest common subsequence: lesson files are small. */
/** table[i][j]: the longest common subsequence of a from i and b from j. */
function lcsTable(a: readonly string[], b: readonly string[]): number[][] {
  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--) {
    const row = table[i] ?? [];
    const below = table[i + 1] ?? [];
    for (let j = b.length - 1; j >= 0; j--) {
      row[j] = a[i] === b[j] ? (below[j + 1] ?? 0) + 1 : Math.max(below[j] ?? 0, row[j + 1] ?? 0);
    }
  }
  return table;
}

/** Whether to drop a's line i rather than take b's line j, walking the table. */
function dropFirst(table: number[][], i: number, j: number): boolean {
  return (table[i + 1]?.[j] ?? 0) >= (table[i]?.[j + 1] ?? 0);
}

/** A line diff by longest common subsequence, removals before additions. */
function lineDiff(before: string[], after: string[]): string[] {
  const table = lcsTable(before, after);
  const out: string[] = [];
  let i = 0;
  let j = 0;
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) {
      out.push(` ${before[i] ?? ""}`);
      i++;
      j++;
    } else if (i < before.length && (j === after.length || dropFirst(table, i, j))) {
      out.push(`-${before[i] ?? ""}`);
      i++;
    } else {
      out.push(`+${after[j] ?? ""}`);
      j++;
    }
  }
  return out;
}

/** For each line of a, the line of b it is kept as, or -1 if it is not kept. */
function matchLines(a: readonly string[], b: readonly string[]): number[] {
  const table = lcsTable(a, b);
  const match = new Array<number>(a.length).fill(-1);
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      match[i] = j;
      i++;
      j++;
    } else if (dropFirst(table, i, j)) {
      i++;
    } else {
      j++;
    }
  }
  return match;
}

function sameLines(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((line, i) => line === b[i]);
}

function joinLines(all: readonly string[]): string {
  return all.length === 0 ? "" : `${all.join("\n")}\n`;
}

/**
 * A three-way merge of one file, line by line, as Git's: the lines both sides
 * kept from the base anchor the merge; between two anchors, a side that left
 * the base alone takes the other's change, and two different changes are a
 * conflict, between markers that hold those lines only. A file deleted on one
 * side and changed on the other is a conflict as a whole.
 */
function mergeFile(
  base: string | undefined,
  ours: string | undefined,
  theirs: string | undefined,
  name: string,
): { text: string; conflict: boolean } {
  if (ours === undefined || theirs === undefined) {
    return { text: conflictText(ours, theirs, name), conflict: true };
  }
  const b = lines(base);
  const o = lines(ours);
  const t = lines(theirs);
  const inOurs = matchLines(b, o);
  const inTheirs = matchLines(b, t);
  const out: string[] = [];
  let conflict = false;
  let ib = 0;
  let io = 0;
  let it = 0;
  for (;;) {
    let anchor = ib;
    while (anchor < b.length && ((inOurs[anchor] ?? -1) < io || (inTheirs[anchor] ?? -1) < it)) {
      anchor++;
    }
    const oEnd = anchor < b.length ? (inOurs[anchor] ?? o.length) : o.length;
    const tEnd = anchor < b.length ? (inTheirs[anchor] ?? t.length) : t.length;
    const bChunk = b.slice(ib, anchor);
    const oChunk = o.slice(io, oEnd);
    const tChunk = t.slice(it, tEnd);
    if (sameLines(oChunk, bChunk)) out.push(...tChunk);
    else if (sameLines(tChunk, bChunk) || sameLines(oChunk, tChunk)) out.push(...oChunk);
    else {
      conflict = true;
      out.push("<<<<<<< HEAD", ...oChunk, "=======", ...tChunk, `>>>>>>> ${name}`);
    }
    if (anchor >= b.length) break;
    out.push(b[anchor] ?? "");
    ib = anchor + 1;
    io = oEnd + 1;
    it = tEnd + 1;
  }
  return { text: joinLines(out), conflict };
}

function diffText(from: Tree, to: Tree, paths: readonly string[]): string {
  const out: string[] = [];
  for (const path of paths) {
    const a = from.get(path);
    const b = to.get(path);
    if (a === b) continue;
    const before = lines(a);
    const after = lines(b);
    out.push(`diff --git a/${path} b/${path}`);
    if (a === undefined) out.push("new file mode 100644");
    if (b === undefined) out.push("deleted file mode 100644");
    out.push(a === undefined ? "--- /dev/null" : `--- a/${path}`);
    out.push(b === undefined ? "+++ /dev/null" : `+++ b/${path}`);
    out.push(`@@ -1,${String(before.length)} +1,${String(after.length)} @@`);
    out.push(...lineDiff(before, after));
  }
  return out.join("\n");
}

// --- Moving the working tree ------------------------------------------------------

/**
 * Takes the index and the working tree from `from` to `to`, as checkout does:
 * only the paths that differ between the two move, and a file the learner
 * changed in one of them stops the move rather than being lost.
 */
function moveTo(draft: Draft, from: Tree, to: Tree, verb: "checkout" | "merge"): void {
  const paths = changedPaths(from, to);
  const local = paths.filter(
    (p) => draft.index.get(p) !== from.get(p) || draft.worktree.get(p) !== from.get(p),
  );
  const tracked = local.filter((p) => from.has(p) || draft.index.has(p));
  if (tracked.length > 0) {
    fail(
      [
        `error: Your local changes to the following files would be overwritten by ${verb}:`,
        ...tracked.map((p) => `\t${p}`),
        verb === "checkout"
          ? "Please commit your changes or stash them before you switch branches."
          : "Please commit your changes or stash them before you merge.",
        "Aborting",
      ].join("\n"),
    );
  }
  const untracked = local.filter((p) => !tracked.includes(p) && to.has(p));
  if (untracked.length > 0) {
    fail(
      [
        `error: The following untracked working tree files would be overwritten by ${verb}:`,
        ...untracked.map((p) => `\t${p}`),
        verb === "checkout"
          ? "Please move or remove them before you switch branches."
          : "Please move or remove them before you merge.",
        "Aborting",
      ].join("\n"),
    );
  }
  for (const p of paths) {
    const content = to.get(p);
    if (content === undefined) {
      draft.index.delete(p);
      draft.worktree.delete(p);
    } else {
      draft.index.set(p, content);
      draft.worktree.set(p, content);
    }
  }
}

function requireNoMerge(draft: Draft): void {
  if (draft.merging) {
    fail(
      "error: you need to resolve your current index first\n" +
        "(finish the merge with git add then git commit, or git merge --abort)",
    );
  }
}

// --- Git commands -------------------------------------------------------------------

function flagValue(args: string[], ...names: string[]): string | undefined {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? "";
    if (names.includes(arg)) return args[i + 1];
  }
  return undefined;
}

function gitAdd(draft: Draft, args: string[]): string {
  const all = args.some((a) => a === "-A" || a === "--all" || a === ".");
  const specs = args.filter((a) => !a.startsWith("-"));
  if (!all && specs.length === 0) {
    fail("Nothing specified, nothing added.\nhint: Maybe you wanted to say 'git add .'?");
  }
  const known = new Set([...draft.worktree.keys(), ...draft.index.keys()]);
  const chosen = new Set<string>();
  if (all) for (const p of known) chosen.add(p);
  for (const spec of specs) {
    if (spec === ".") continue;
    const clean = checkPath("git add", spec);
    const matched = [...known].filter((p) => covers(clean, p));
    if (matched.length === 0) fail(`fatal: pathspec '${spec}' did not match any files`);
    for (const p of matched) chosen.add(p);
  }
  for (const p of chosen) {
    const content = draft.worktree.get(p);
    if (content === undefined) draft.index.delete(p);
    else draft.index.set(p, content);
  }
  if (draft.merging) {
    draft.merging = {
      ...draft.merging,
      conflicts: draft.merging.conflicts.filter((p) => !chosen.has(p)),
    };
  }
  return "";
}

function gitRm(draft: Draft, args: string[]): string {
  const cached = args.includes("--cached");
  const specs = args.filter((a) => !a.startsWith("-"));
  if (specs.length === 0) fail("usage: git rm [--cached] <file>...");
  const out: string[] = [];
  for (const spec of specs) {
    const clean = checkPath("git rm", spec);
    const matched = [...draft.index.keys()].filter((p) => covers(clean, p));
    if (matched.length === 0) fail(`fatal: pathspec '${spec}' did not match any files`);
    for (const p of matched) {
      draft.index.delete(p);
      if (!cached) draft.worktree.delete(p);
      out.push(`rm '${p}'`);
    }
  }
  return out.join("\n");
}

function gitCommit(draft: Draft, args: string[]): string {
  if (args.includes("--amend")) {
    fail("Ce bac à sable ne réécrit pas un commit avec --amend : fais un nouveau commit.");
  }
  let message = flagValue(args, "-m", "--message", "-am");
  const all = args.includes("-a") || args.includes("--all") || args.includes("-am");
  if (all) {
    for (const p of [...draft.index.keys()]) {
      const content = draft.worktree.get(p);
      if (content === undefined) draft.index.delete(p);
      else draft.index.set(p, content);
    }
  }
  if (draft.merging && draft.merging.conflicts.length > 0) {
    fail(
      [
        "error: Committing is not possible because you have unmerged files.",
        "hint: Fix them up in the work tree, and then use 'git add/rm <file>'",
        "hint: as appropriate to mark resolution and make a commit.",
        "fatal: Exiting because of an unresolved conflict.",
      ].join("\n"),
    );
  }
  if (message === undefined) {
    if (!draft.merging) {
      fail(`Ce bac à sable n'ouvre pas d'éditeur : donne le message avec -m "ton message".`);
    }
    message = `Merge branch '${draft.merging.name}'`;
  }
  if (message.trim() === "") fail("Aborting commit due to empty commit message.");
  const parent = headCommit(draft);
  const before = parent?.tree ?? new Map<string, string>();
  const changed = changedPaths(before, draft.index);
  if (changed.length === 0 && !draft.merging) fail(statusText(draft));
  const parents = parent === undefined ? [] : [parent.id];
  if (draft.merging) parents.push(draft.merging.theirs);
  const commit = newCommit(draft, message, parents, draft.index);
  draft.branches.set(draft.head, commit.id);
  draft.merging = null;
  const root = parent === undefined ? " (root-commit)" : "";
  const summary = `[${draft.head}${root} ${commit.id}] ${firstLine(message)}`;
  // Git gives no file count for a merge commit: against which parent would it be?
  return parents.length > 1 ? summary : `${summary}\n${filesChanged(changed.length)}`;
}

function decorations(draft: Draft, id: string): string {
  const names = [...draft.branches.entries()]
    .filter(([name, target]) => target === id && name !== draft.head)
    .map(([name]) => name)
    .sort();
  if (draft.branches.get(draft.head) === id) names.unshift(`HEAD -> ${draft.head}`);
  return names.length > 0 ? ` (${names.join(", ")})` : "";
}

function gitLog(draft: Draft, args: string[]): string {
  const oneline = args.includes("--oneline");
  let limit = Number.POSITIVE_INFINITY;
  const refs: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? "";
    if (arg === "-n") {
      limit = Number(args[i + 1] ?? "");
      i++;
    } else if (/^-\d+$/u.test(arg)) {
      limit = Number(arg.slice(1));
    } else if (!arg.startsWith("-")) {
      refs.push(arg);
    }
  }
  const starts: string[] = [];
  if (args.includes("--all")) starts.push(...draft.branches.values());
  for (const ref of refs) {
    const commit = resolveRef(draft, ref);
    if (!commit) {
      fail(`fatal: ambiguous argument '${ref}': unknown revision or path not in the working tree.`);
    }
    starts.push(commit.id);
  }
  if (starts.length === 0) {
    const head = headCommit(draft);
    if (!head) {
      fail(`fatal: your current branch '${draft.head}' does not have any commits yet`);
    }
    starts.push(head.id);
  }
  const seen = new Set<string>();
  for (const start of starts) for (const id of ancestors(draft, start)) seen.add(id);
  const commits = [...seen]
    .map((id) => draft.commits.get(id))
    .filter((c): c is GitCommit => c !== undefined)
    .sort((a, b) => b.order - a.order)
    .slice(0, Number.isFinite(limit) ? Math.max(0, limit) : undefined);
  if (oneline) {
    return commits
      .map((c) => `${c.id}${decorations(draft, c.id)} ${firstLine(c.message)}`)
      .join("\n");
  }
  return commits
    .map((c) =>
      [
        `commit ${c.id}${decorations(draft, c.id)}`,
        ...(c.parents.length > 1 ? [`Merge: ${c.parents.join(" ")}`] : []),
        "Author: Toi <toi@cyberlearn.fr>",
        "",
        ...c.message.split("\n").map((l) => `    ${l}`),
      ].join("\n"),
    )
    .join("\n\n");
}

function gitDiff(draft: Draft, args: string[]): string {
  const specs = args.filter((a) => !a.startsWith("-"));
  const wanted = (p: string): boolean =>
    specs.length === 0 || specs.some((s) => covers(checkPath("git diff", s), p));
  if (args.includes("--staged") || args.includes("--cached")) {
    const head = headTree(draft);
    return diffText(head, draft.index, changedPaths(head, draft.index).filter(wanted));
  }
  const tracked = [...draft.index.keys()].filter(wanted).sort();
  return diffText(draft.index, draft.worktree, tracked);
}

function validBranchName(name: string): boolean {
  return (
    /^[A-Za-z0-9][A-Za-z0-9._/-]{0,59}$/u.test(name) &&
    !name.includes("..") &&
    !name.endsWith("/") &&
    !name.endsWith(".lock") &&
    !name.includes("//") &&
    name !== "HEAD"
  );
}

function createBranch(draft: Draft, name: string, start: string | undefined): GitCommit {
  if (!validBranchName(name)) fail(`fatal: '${name}' is not a valid branch name`);
  if (draft.branches.has(name)) fail(`fatal: a branch named '${name}' already exists`);
  const commit = resolveRef(draft, start ?? "HEAD");
  if (!commit) fail(`fatal: not a valid object name: '${start ?? draft.head}'`);
  draft.branches.set(name, commit.id);
  return commit;
}

function gitBranch(draft: Draft, args: string[]): string {
  const deleteFlag = args.find((a) => a === "-d" || a === "-D" || a === "--delete");
  const moveFlag = args.find((a) => a === "-m" || a === "-M" || a === "--move");
  const names = args.filter((a) => !a.startsWith("-"));
  if (deleteFlag) {
    if (names.length === 0) fail("fatal: branch name required");
    const out: string[] = [];
    for (const name of names) {
      const target = draft.branches.get(name);
      if (target === undefined) fail(`error: branch '${name}' not found`);
      if (name === draft.head) {
        fail(`error: cannot delete branch '${name}' used by worktree at '${SANDBOX_DIR}'`);
      }
      const head = headCommit(draft);
      const merged = head !== undefined && ancestors(draft, head.id).has(target);
      if (!merged && deleteFlag !== "-D") {
        fail(
          `error: the branch '${name}' is not fully merged\n` +
            `hint: If you are sure you want to delete it, run 'git branch -D ${name}'`,
        );
      }
      draft.branches.delete(name);
      out.push(`Deleted branch ${name} (was ${target}).`);
    }
    return out.join("\n");
  }
  if (moveFlag) {
    const from = names.length >= 2 ? (names[0] ?? draft.head) : draft.head;
    const to = names.length >= 2 ? names[1] : names[0];
    if (to === undefined) fail("fatal: branch name required");
    if (!validBranchName(to)) fail(`fatal: '${to}' is not a valid branch name`);
    if (draft.branches.has(to) && moveFlag !== "-M" && to !== from) {
      fail(`fatal: a branch named '${to}' already exists`);
    }
    const target = draft.branches.get(from);
    if (target === undefined && from !== draft.head) {
      fail(`error: refname refs/heads/${from} not found`);
    }
    if (target !== undefined) {
      draft.branches.delete(from);
      draft.branches.set(to, target);
    }
    if (draft.head === from) draft.head = to;
    return "";
  }
  if (names.length > 0) {
    createBranch(draft, names[0] ?? "", names[1]);
    return "";
  }
  return [...draft.branches.keys()]
    .sort()
    .map((name) => `${name === draft.head ? "*" : " "} ${name}`)
    .join("\n");
}

function switchBranch(draft: Draft, name: string): string {
  const target = draft.branches.get(name);
  if (target === undefined) fail(`fatal: invalid reference: ${name}`);
  if (name === draft.head) return `Already on '${name}'`;
  requireNoMerge(draft);
  const to = draft.commits.get(target)?.tree ?? new Map<string, string>();
  moveTo(draft, headTree(draft), to, "checkout");
  draft.head = name;
  return `Switched to branch '${name}'`;
}

function switchNew(draft: Draft, name: string, start: string | undefined): string {
  requireNoMerge(draft);
  if (headCommit(draft) === undefined && start === undefined) {
    // A branch that has no commit yet: only its name changes.
    if (!validBranchName(name)) fail(`fatal: '${name}' is not a valid branch name`);
    if (draft.branches.has(name)) fail(`fatal: a branch named '${name}' already exists`);
    draft.head = name;
    return `Switched to a new branch '${name}'`;
  }
  const from = headTree(draft);
  const commit = createBranch(draft, name, start);
  moveTo(draft, from, commit.tree, "checkout");
  draft.head = name;
  return `Switched to a new branch '${name}'`;
}

const DETACHED =
  "Ce bac à sable reste sur des branches : pour repartir d'un ancien commit, crée une branche à cet endroit (git switch -c nom <commit>).";

function gitSwitch(draft: Draft, args: string[]): string {
  const create = args.find((a) => a === "-c" || a === "-C" || a === "--create");
  if (args.includes("--detach") || args.includes("-d")) fail(DETACHED);
  const names = args.filter((a) => !a.startsWith("-"));
  if (create) {
    if (names[0] === undefined) fail(`error: switch \`${create}' requires a value`);
    return switchNew(draft, names[0], names[1]);
  }
  const name = names[0];
  if (name === undefined) fail("fatal: missing branch or commit argument");
  if (!draft.branches.has(name) && resolveRef(draft, name)) fail(DETACHED);
  return switchBranch(draft, name);
}

function gitCheckout(draft: Draft, args: string[]): string {
  const create = args.find((a) => a === "-b" || a === "-B");
  const dashes = args.indexOf("--");
  const names = (dashes === -1 ? args : args.slice(0, dashes)).filter((a) => !a.startsWith("-"));
  const files = dashes === -1 ? [] : args.slice(dashes + 1);
  if (create) {
    if (names[0] === undefined) fail(`error: switch \`${create.slice(1)}' requires a value`);
    return switchNew(draft, names[0], names[1]);
  }
  const first = names[0];
  if (files.length === 0 && first !== undefined && draft.branches.has(first)) {
    return switchBranch(draft, first);
  }
  if (files.length === 0 && first !== undefined && resolveRef(draft, first)) fail(DETACHED);
  const specs = files.length > 0 ? files : names;
  if (specs.length === 0) fail("Précise une branche, ou -- suivi des fichiers à remettre.");
  return restoreFromIndex(draft, specs, "checkout");
}

function restoreFromIndex(draft: Draft, specs: string[], verb: "checkout" | "restore"): string {
  let count = 0;
  for (const spec of specs) {
    const clean = checkPath(`git ${verb}`, spec);
    const matched = [...draft.index.keys()].filter((p) => covers(clean, p));
    if (matched.length === 0) {
      fail(`error: pathspec '${spec}' did not match any file(s) known to git`);
    }
    for (const p of matched) {
      const content = draft.index.get(p);
      if (content !== undefined && draft.worktree.get(p) !== content) {
        draft.worktree.set(p, content);
        count++;
      }
    }
  }
  return verb === "checkout"
    ? `Updated ${String(count)} path${count === 1 ? "" : "s"} from the index`
    : "";
}

function gitRestore(draft: Draft, args: string[]): string {
  const specs = args.filter((a) => !a.startsWith("-"));
  if (specs.length === 0) fail("fatal: you must specify path(s) to restore");
  if (args.includes("--staged") || args.includes("-S")) {
    const head = headTree(draft);
    for (const spec of specs) {
      const clean = checkPath("git restore", spec);
      const known = new Set([...draft.index.keys(), ...head.keys()]);
      const matched = [...known].filter((p) => covers(clean, p));
      if (matched.length === 0) {
        fail(`error: pathspec '${spec}' did not match any file(s) known to git`);
      }
      for (const p of matched) {
        const content = head.get(p);
        if (content === undefined) draft.index.delete(p);
        else draft.index.set(p, content);
      }
    }
    return "";
  }
  return restoreFromIndex(draft, specs, "restore");
}

function conflictText(ours: string | undefined, theirs: string | undefined, name: string): string {
  const close = (text: string | undefined): string =>
    text === undefined || text === "" ? "" : text.endsWith("\n") ? text : `${text}\n`;
  return `<<<<<<< HEAD\n${close(ours)}=======\n${close(theirs)}>>>>>>> ${name}\n`;
}

function gitMerge(draft: Draft, args: string[]): string | Halt {
  if (args.includes("--abort")) {
    if (!draft.merging) fail("fatal: There is no merge to abort (MERGE_HEAD missing).");
    const head = headTree(draft);
    const untracked = [...draft.worktree.entries()].filter(
      ([p]) => !draft.index.has(p) && !head.has(p) && !draft.merging?.conflicts.includes(p),
    );
    draft.index = new Map(head);
    draft.worktree = new Map([...head, ...untracked]);
    draft.merging = null;
    return "";
  }
  if (args.includes("--continue")) {
    if (!draft.merging) fail("fatal: There is no merge in progress (MERGE_HEAD missing).");
    return gitCommit(draft, []);
  }
  if (draft.merging) {
    fail(
      "error: Merging is not possible because you have unmerged files.\n" +
        "fatal: You have not concluded your merge (MERGE_HEAD exists).",
    );
  }
  const message = flagValue(args, "-m");
  const noFf = args.includes("--no-ff");
  const names = args.filter((a, i) => !a.startsWith("-") && args[i - 1] !== "-m");
  const name = names[0];
  if (name === undefined) fail("fatal: No remote for the current branch.");
  const theirs = resolveRef(draft, name);
  if (!theirs) fail(`merge: ${name} - not something we can merge`);
  const ours = headCommit(draft);
  if (!ours) {
    moveTo(draft, new Map(), theirs.tree, "merge");
    draft.branches.set(draft.head, theirs.id);
    return `Fast-forward\n${filesChanged(theirs.tree.size)}`;
  }
  if (ancestors(draft, ours.id).has(theirs.id)) return "Already up to date.";
  if (!noFf && ancestors(draft, theirs.id).has(ours.id)) {
    const changed = changedPaths(ours.tree, theirs.tree);
    moveTo(draft, ours.tree, theirs.tree, "merge");
    draft.branches.set(draft.head, theirs.id);
    return `Updating ${ours.id}..${theirs.id}\nFast-forward\n${filesChanged(changed.length)}`;
  }
  const base = mergeBase(draft, ours.id, theirs.id)?.tree ?? new Map<string, string>();
  const result = new Map<string, string>();
  const conflicts: string[] = [];
  const marked = new Map<string, string>();
  const autoMerged: string[] = [];
  const paths = new Set([...ours.tree.keys(), ...theirs.tree.keys(), ...base.keys()]);
  for (const p of [...paths].sort()) {
    const o = ours.tree.get(p);
    const t = theirs.tree.get(p);
    const b = base.get(p);
    let merged = o === t ? o : o === b ? t : t === b ? o : null;
    if (merged === null) {
      // Both sides changed the file: merged line by line.
      autoMerged.push(p);
      const file = mergeFile(b, o, t, name);
      if (file.conflict) {
        conflicts.push(p);
        marked.set(p, file.text);
        continue;
      }
      merged = file.text;
    }
    if (merged !== undefined) result.set(p, merged);
  }
  const autoLines = autoMerged.map((p) =>
    conflicts.includes(p)
      ? `Auto-merging ${p}\nCONFLICT (content): Merge conflict in ${p}`
      : `Auto-merging ${p}`,
  );
  const changed = changedPaths(ours.tree, result);
  const touched = [...new Set([...changed, ...conflicts])];
  const dirty = touched.filter(
    (p) => draft.index.get(p) !== ours.tree.get(p) || draft.worktree.get(p) !== ours.tree.get(p),
  );
  if (dirty.length > 0) {
    fail(
      [
        "error: Your local changes to the following files would be overwritten by merge:",
        ...dirty.map((p) => `\t${p}`),
        "Please commit your changes or stash them before you merge.",
        "Aborting",
      ].join("\n"),
    );
  }
  for (const p of changed) {
    const content = result.get(p);
    if (content === undefined) {
      draft.index.delete(p);
      draft.worktree.delete(p);
    } else {
      draft.index.set(p, content);
      draft.worktree.set(p, content);
    }
  }
  if (conflicts.length > 0) {
    for (const [p, text] of marked) draft.worktree.set(p, text);
    draft.merging = { name, theirs: theirs.id, conflicts };
    return new Halt(
      [...autoLines, "Automatic merge failed; fix conflicts and then commit the result."].join(
        "\n",
      ),
    );
  }
  const commit = newCommit(
    draft,
    message ?? `Merge branch '${name}'`,
    [ours.id, theirs.id],
    draft.index,
  );
  draft.branches.set(draft.head, commit.id);
  return [...autoLines, "Merge made by the 'ort' strategy.", filesChanged(changed.length)].join(
    "\n",
  );
}

function gitRebase(draft: Draft, args: string[]): string {
  if (args.includes("--abort") || args.includes("--continue") || args.includes("--skip")) {
    fail("fatal: No rebase in progress?");
  }
  if (args.includes("-i") || args.includes("--interactive")) {
    fail("Ce bac à sable ne fait pas de rebase interactif : git rebase <branche> seulement.");
  }
  requireNoMerge(draft);
  const name = args.find((a) => !a.startsWith("-"));
  if (name === undefined) fail("fatal: no upstream configured for the current branch.");
  const onto = resolveRef(draft, name);
  if (!onto) fail(`fatal: invalid upstream '${name}'`);
  const ours = headCommit(draft);
  if (!ours) fail(`fatal: your current branch '${draft.head}' does not have any commits yet`);
  const status = statusOf(draft);
  if (status.staged.length > 0 || status.unstaged.length > 0) {
    fail("error: cannot rebase: You have unstaged changes.\nerror: Please commit or stash them.");
  }
  if (ancestors(draft, ours.id).has(onto.id)) {
    return `Current branch ${draft.head} is up to date.`;
  }
  const upstream = ancestors(draft, onto.id);
  const replay = history(draft, ours.id)
    .filter((c) => !upstream.has(c.id) && c.parents.length <= 1)
    .reverse();
  const tree = new Map(onto.tree);
  let parent = onto.id;
  for (const commit of replay) {
    const before = draft.commits.get(commit.parents[0] ?? "")?.tree ?? new Map<string, string>();
    let moved = false;
    for (const p of changedPaths(before, commit.tree)) {
      const current = tree.get(p);
      const wanted = commit.tree.get(p);
      if (current === wanted) continue;
      let content = wanted;
      if (current !== before.get(p)) {
        // The upstream changed this file too: the commit's change is merged in.
        const file = mergeFile(before.get(p), current, wanted, firstLine(commit.message));
        if (file.conflict) {
          fail(
            `Conflit sur ${p} en rejouant « ${firstLine(commit.message)} ». ` +
              "Ce bac à sable n'arrête pas un rebase au milieu d'un conflit : rien n'a bougé. " +
              "Pour ce cas, fais un merge.",
          );
        }
        content = file.text;
      }
      if (content === undefined) tree.delete(p);
      else tree.set(p, content);
      moved = true;
    }
    if (!moved) continue;
    parent = newCommit(draft, commit.message, [parent], tree).id;
  }
  moveTo(draft, ours.tree, tree, "checkout");
  draft.branches.set(draft.head, parent);
  return `Successfully rebased and updated refs/heads/${draft.head}.`;
}

function gitReset(draft: Draft, args: string[]): string {
  const mode = args.includes("--hard") ? "hard" : args.includes("--soft") ? "soft" : "mixed";
  const rest = args.filter((a) => !a.startsWith("-"));
  const first = rest[0];
  const target = first === undefined ? headCommit(draft) : resolveRef(draft, first);
  const ambiguous = `fatal: ambiguous argument '${first ?? "HEAD"}': unknown revision or path not in the working tree.`;
  if (first !== undefined && target === undefined) {
    // Not a commit: `git reset file` unstages it, as git restore --staged.
    if (mode !== "mixed" || first === "HEAD" || /[~^]/u.test(first)) fail(ambiguous);
    return gitRestore(draft, ["--staged", ...rest]);
  }
  if (rest.length > 1) {
    if (mode !== "mixed") fail(`fatal: Cannot do ${mode} reset with paths.`);
    return gitRestore(draft, ["--staged", ...rest.slice(1)]);
  }
  if (!target) fail(ambiguous);
  const before = headTree(draft);
  draft.branches.set(draft.head, target.id);
  if (mode === "soft") return "";
  if (mode === "mixed") {
    draft.index = new Map(target.tree);
    draft.merging = null;
    return "";
  }
  const untracked = [...draft.worktree.entries()].filter(
    ([p]) => !draft.index.has(p) && !before.has(p) && !target.tree.has(p),
  );
  draft.index = new Map(target.tree);
  draft.worktree = new Map([...target.tree, ...untracked]);
  draft.merging = null;
  return `HEAD is now at ${target.id} ${firstLine(target.message)}`;
}

const GIT_COMMANDS =
  "init, status, add, rm, commit, log, diff, branch, switch, checkout, merge, rebase, reset, restore";

function git(draft: Draft, args: string[]): string | Halt {
  const [sub, ...rest] = args;
  if (sub === undefined || sub === "help" || sub === "--help") {
    return `usage: git <command>\nCommandes de ce bac à sable : ${GIT_COMMANDS}.`;
  }
  if (sub === "--version" || sub === "version") return "git version 2.47.0";
  if (sub === "config") return "";
  if (sub === "init") {
    const again = draft.initialized;
    draft.initialized = true;
    return `${again ? "Reinitialized existing" : "Initialized empty"} Git repository in ${SANDBOX_DIR}/.git/`;
  }
  if (!draft.initialized) {
    if (["push", "pull", "fetch", "clone", "remote"].includes(sub)) {
      fail(`Pas de dépôt distant dans ce bac à sable : git ${sub} se pratique ailleurs.`);
    }
    fail("fatal: not a git repository (or any of the parent directories): .git");
  }
  switch (sub) {
    case "status":
      return statusText(draft);
    case "add":
      return gitAdd(draft, rest);
    case "rm":
      return gitRm(draft, rest);
    case "commit":
      return gitCommit(draft, rest);
    case "log":
      return gitLog(draft, rest);
    case "diff":
      return gitDiff(draft, rest);
    case "branch":
      return gitBranch(draft, rest);
    case "switch":
      return gitSwitch(draft, rest);
    case "checkout":
      return gitCheckout(draft, rest);
    case "merge":
      return gitMerge(draft, rest);
    case "rebase":
      return gitRebase(draft, rest);
    case "reset":
      return gitReset(draft, rest);
    case "restore":
      return gitRestore(draft, rest);
    case "push":
    case "pull":
    case "fetch":
    case "clone":
    case "remote":
      return fail(
        `Pas de dépôt distant dans ce bac à sable : git ${sub} se pratique dans la leçon sur les remotes.`,
      );
    case "stash":
    case "cherry-pick":
    case "revert":
    case "tag":
    case "show":
    case "blame":
    case "bisect":
      return fail(`git ${sub} n'existe pas dans ce bac à sable. Commandes : ${GIT_COMMANDS}.`);
    default:
      return fail(`git: '${sub}' is not a git command. See 'git --help'.`);
  }
}

// --- Shell commands -------------------------------------------------------------------

function writeFile(draft: Draft, command: string, path: string, content: string): void {
  const clean = checkPath(command, path);
  if (!draft.worktree.has(clean) && draft.worktree.size >= MAX_FILES) {
    fail(`${command}: ce bac à sable s'arrête à ${String(MAX_FILES)} fichiers.`);
  }
  if (content.length > MAX_FILE_LENGTH) fail(`${command}: fichier trop long pour ce bac à sable.`);
  draft.worktree.set(clean, content);
}

const SHELL_HELP = [
  "Commandes de ce bac à sable :",
  '  echo "texte" > fichier    écrit le fichier (>> ajoute une ligne)',
  "  cat fichier               affiche le fichier",
  "  ls                        liste les fichiers",
  "  touch fichier             crée un fichier vide",
  "  rm fichier                supprime le fichier",
  `  git ...                   ${GIT_COMMANDS}`,
  "  clear                     efface l'écran",
].join("\n");

function command(draft: Draft, tokens: Token[]): string | Halt {
  const redirect = tokens.findIndex((t) => t.op && (t.text === ">" || t.text === ">>"));
  const words = (redirect === -1 ? tokens : tokens.slice(0, redirect)).map((t) => t.text);
  const [name, ...args] = words;
  if (name === undefined) return "";
  if (redirect !== -1) {
    if (name !== "echo") fail(`Dans ce bac à sable, seul echo écrit dans un fichier.`);
    const target = tokens[redirect + 1];
    if (target === undefined || target.op) fail("syntax error near unexpected token `newline'");
    const text = `${args.filter((a) => a !== "-e" && a !== "-n").join(" ")}\n`;
    const append = tokens[redirect]?.text === ">>";
    const path = checkPath("echo", target.text);
    writeFile(draft, "echo", path, append ? `${draft.worktree.get(path) ?? ""}${text}` : text);
    return "";
  }
  switch (name) {
    case "echo":
      return args.filter((a) => a !== "-e" && a !== "-n").join(" ");
    case "cat": {
      if (args.length === 0) fail("cat: précise un fichier");
      return args
        .map((a) => {
          const content = draft.worktree.get(checkPath("cat", a));
          if (content === undefined) fail(`cat: ${a}: No such file or directory`);
          return content.replace(/\n$/u, "");
        })
        .join("\n");
    }
    case "ls":
      return [...draft.worktree.keys()].sort().join("\n");
    case "touch":
      for (const a of args) {
        const path = checkPath("touch", a);
        if (!draft.worktree.has(path)) writeFile(draft, "touch", path, "");
      }
      return "";
    case "rm":
      for (const a of args.filter((x) => !x.startsWith("-"))) {
        const path = checkPath("rm", a);
        if (!draft.worktree.has(path)) {
          if (args.includes("-f")) continue;
          fail(`rm: cannot remove '${a}': No such file or directory`);
        }
        draft.worktree.delete(path);
      }
      return "";
    case "mkdir":
      return "";
    case "pwd":
      return SANDBOX_DIR;
    case "clear":
      return "";
    case "help":
      return SHELL_HELP;
    case "git":
      return git(draft, args);
    default:
      return fail(`${name}: command not found (tape help pour la liste)`);
  }
}

function draftOf(state: GitState): Draft {
  return {
    initialized: state.initialized,
    commits: new Map(state.commits),
    branches: new Map(state.branches),
    known: new Set(state.known),
    head: state.head,
    index: new Map(state.index),
    worktree: new Map(state.worktree),
    merging: state.merging,
    counter: state.counter,
  };
}

/**
 * Runs one command line. Commands joined by && run in turn and stop at the
 * first that fails; a failed command leaves the state as it found it.
 */
export function run(state: GitState, line: string): GitRun {
  const tokens = tokenize(line.trim());
  if (tokens === null) return { state, output: "Guillemet non fermé.", ok: false };
  let current = state;
  const outputs: string[] = [];
  let start = 0;
  for (let i = 0; i <= tokens.length; i++) {
    const token = tokens[i];
    if (token !== undefined && !(token.op && token.text === "&&")) continue;
    const draft = draftOf(current);
    try {
      const out = command(draft, tokens.slice(start, i));
      for (const name of draft.branches.keys()) draft.known.add(name);
      current = draft;
      if (out instanceof Halt) {
        outputs.push(out.output);
        return { state: current, output: outputs.join("\n"), ok: false };
      }
      if (out !== "") outputs.push(out);
    } catch (error) {
      if (!(error instanceof Failure)) throw error;
      outputs.push(error.message);
      return { state: current, output: outputs.join("\n"), ok: false };
    }
    start = i + 1;
  }
  return { state: current, output: outputs.join("\n"), ok: true };
}

/**
 * Runs an exercise's setup: the state it starts from, or the line that fails.
 * A merge left in conflict is a fair start (the exercise is to resolve it).
 */
export function runSetup(
  commands: readonly string[],
): { ok: true; state: GitState } | { ok: false; command: string; output: string } {
  let state = EMPTY_STATE;
  for (const line of commands) {
    const result = run(state, line);
    if (!result.ok && (result.state === state || result.state.merging === null)) {
      return { ok: false, command: line, output: result.output };
    }
    state = result.state;
  }
  return { ok: true, state };
}

/** The prompt, with the branch as a configured shell shows it. */
export function promptOf(state: GitState): string {
  if (!state.initialized) return "toi@cyberlearn:~/projet$";
  return `toi@cyberlearn:~/projet (${state.head}${state.merging ? "|MERGING" : ""})$`;
}
