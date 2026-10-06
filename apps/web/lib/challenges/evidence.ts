import { parseChallengeMachine } from "@cyberlearn/types";

/**
 * A glimpse of what a challenge hands over, for its card and for the week's
 * panel: what `ls` shows on its machine, and the first lines of its biggest
 * file. Built on the server from the stored machine, never from the learner's
 * own: what is hidden stays hidden (a name starting with a dot is often the
 * very thing to find) and a line holding a flag placeholder is left out. A
 * locked challenge gets none: its machine is not handed out either.
 */

export interface EvidenceLine {
  /** A command typed at the prompt, or what it printed. */
  kind: "cmd" | "out";
  text: string;
}

export interface ChallengeEvidence {
  /** The session: `ls`, then `ls` of the first folder. */
  listing: EvidenceLine[];
  /** The first lines of the biggest visible file, with its path. */
  excerpt: { file: string; lines: string[] } | null;
}

/** At most this many names on a line of `ls`, then an ellipsis. */
const MAX_NAMES = 8;
const EXCERPT_LINES = 3;
const MAX_LINE = 140;

function isHidden(path: string): boolean {
  return path.split("/").some((part) => part.startsWith("."));
}

/** The names right under `dir` ("" for the top), a folder with a trailing slash. */
function namesUnder(paths: readonly string[], dir: string): string[] {
  const prefix = dir === "" ? "" : `${dir}/`;
  const names = new Set<string>();
  for (const path of paths) {
    if (!path.startsWith(prefix)) continue;
    const [first, ...rest] = path.slice(prefix.length).split("/");
    if (first !== undefined && first !== "") names.add(rest.length > 0 ? `${first}/` : first);
  }
  // Byte order, as `ls` sorts in the machine's C locale.
  return [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function namesLine(names: readonly string[]): string {
  const shown = names.slice(0, MAX_NAMES).join("  ");
  return names.length > MAX_NAMES ? `${shown}  …` : shown;
}

function clip(line: string): string {
  return line.length > MAX_LINE ? `${line.slice(0, MAX_LINE - 1)}…` : line;
}

/** The glimpse of a machine-played challenge, or null when there is no machine to read. */
export function machineEvidence(rawMachine: unknown): ChallengeEvidence | null {
  if (rawMachine === null || rawMachine === undefined) return null;
  const parsed = parseChallengeMachine(rawMachine);
  if (!parsed.ok) return null;

  const visible = Object.entries(parsed.machine.files).filter(([path]) => !isHidden(path));
  if (visible.length === 0) return null;
  const paths = visible.map(([path]) => path);

  const top = namesUnder(paths, "");
  const listing: EvidenceLine[] = [
    { kind: "cmd", text: "ls" },
    { kind: "out", text: namesLine(top) },
  ];
  const firstDir = top.find((name) => name.endsWith("/"));
  if (firstDir !== undefined) {
    listing.push(
      { kind: "cmd", text: `ls ${firstDir}` },
      { kind: "out", text: namesLine(namesUnder(paths, firstDir.slice(0, -1))) },
    );
  }

  // The biggest file is where the reading is: the logs, not the README.
  const [file, content] = visible.reduce((best, entry) =>
    entry[1].length > best[1].length ? entry : best,
  );
  const lines = content
    .split("\n")
    .filter((line) => line.trim() !== "" && !line.includes("{{"))
    .slice(0, EXCERPT_LINES)
    .map(clip);

  return { listing, excerpt: lines.length > 0 ? { file, lines } : null };
}

/** The glimpse of a challenge with a file to download: its name, as `ls` would show it. */
export function attachmentEvidence(url: string): ChallengeEvidence {
  let name = url;
  try {
    name = decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "") || url;
  } catch {
    // Not a URL the page could parse: the stored text, as is.
  }
  return {
    listing: [
      { kind: "cmd", text: "ls ~/Téléchargements" },
      { kind: "out", text: clip(name) },
    ],
    excerpt: null,
  };
}
