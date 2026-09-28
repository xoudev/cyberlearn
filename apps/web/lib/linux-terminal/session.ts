/**
 * The parts of a lesson's real Linux terminal that do not need a browser:
 * preparing the machine, and following what the learner types.
 *
 * The machine is v86 booting a Buildroot image (public/runtimes/v86). It gives
 * a root shell on its serial console, and mounts at /mnt a filesystem the page
 * can write into: that is where a lesson's files go, and where the learner
 * starts. See components/linux-terminal.tsx for the component itself.
 */

/** Where the lesson's files appear in the machine, and where the shell starts. */
export const LESSON_DIR = "/mnt";

/**
 * A lesson file path, relative to LESSON_DIR: plain names separated by
 * slashes. No "." or "..", no leading slash, nothing a shell would read as
 * more than a name - the setup command quotes the directories, but a path
 * that needs quoting to be safe is not one a lesson should use. A name may
 * start with a dot: hidden files are part of what the lessons teach.
 */
export function isLessonFilePath(path: string): boolean {
  if (!/^[A-Za-z0-9_.][A-Za-z0-9_.-]*(?:\/[A-Za-z0-9_.][A-Za-z0-9_.-]*)*$/.test(path)) return false;
  return path.split("/").every((part) => part !== "." && part !== "..");
}

/** The directories the files need, parents first, each once. */
export function directoriesOf(paths: readonly string[]): string[] {
  const dirs = new Set<string>();
  for (const path of paths) {
    const parts = path.split("/").slice(0, -1);
    for (let i = 1; i <= parts.length; i++) dirs.add(parts.slice(0, i).join("/"));
  }
  return [...dirs].sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b));
}

/**
 * The one line the page types into the fresh shell before handing it over:
 * the terminal's real size (the shell assumes 80 columns and would wrap lines
 * in the wrong place), the lesson's directories, then the lesson directory,
 * and a clear screen. The files themselves are written from the page once the
 * directories exist.
 */
export function setupCommand(paths: readonly string[], cols: number, rows: number): string {
  const dirs = directoriesOf(paths).map((d) => `'${LESSON_DIR}/${d}'`);
  const steps = [`stty cols ${String(cols)} rows ${String(rows)}`];
  if (dirs.length > 0) steps.push(`mkdir -p ${dirs.join(" ")}`);
  steps.push(`cd ${LESSON_DIR}`, "clear");
  return `${steps.join("; ")}\n`;
}

/** The shell's prompt ends every command: "~% ", "/mnt% ". */
export function endsWithPrompt(text: string): boolean {
  return text.endsWith("% ");
}

/** How a command compares to an expected one: spaces trimmed and collapsed. */
export function normalizeCommand(line: string): string {
  return line.trim().replace(/\s+/g, " ");
}

/**
 * Text for the serial port, which takes one byte per character: the UTF-8
 * bytes of what the learner typed, so an accent reaches the shell intact.
 */
export function toSerial(text: string): string {
  let out = "";
  for (const byte of new TextEncoder().encode(text)) out += String.fromCharCode(byte);
  return out;
}

/**
 * Follows the keys the learner sends and reports each line they submit.
 *
 * It sees keystrokes, not the shell's screen: typed characters, erasing,
 * Enter. A line edited with the arrows or recalled from the history cannot be
 * reconstructed from keystrokes alone, so such a line is not reported rather
 * than reported wrong; retyping it counts.
 */
export function createLineTracker(
  onLine: (line: string) => void,
  /** Called on every Enter, reliable line or not: the moment to look again. */
  onEnter?: () => void,
): (data: string) => void {
  let line = "";
  let reliable = true;
  return (data: string) => {
    for (let i = 0; i < data.length; i++) {
      const ch = data[i] ?? "";
      if (ch === "\r" || ch === "\n") {
        const submitted = normalizeCommand(line);
        if (reliable && submitted !== "") onLine(submitted);
        onEnter?.();
        line = "";
        reliable = true;
      } else if (ch === "\x7f" || ch === "\b") {
        line = line.slice(0, -1);
      } else if (ch === "\x15" || ch === "\x03") {
        // Ctrl+U erases the line, Ctrl+C abandons it.
        line = "";
        reliable = true;
      } else if (ch === "\x1b") {
        // An arrow, Home, End, a history recall: the line is no longer known.
        reliable = false;
        // Skip the rest of the escape sequence.
        while (i + 1 < data.length && !/[A-Za-z~]/.test(data[i + 1] ?? "")) i++;
        i++;
      } else if (ch >= " ") {
        line += ch;
      }
    }
  };
}

// ── Checking the state the learner leaves ────────────────────────────────────

/** What a path of the lesson directory turned out to be. */
export type PathState = "file" | "dir" | "absent";

/**
 * One thing the exercise asks the learner to leave behind: a path that must
 * be a file (optionally containing a text), a directory, or nothing at all.
 * Checked in the machine itself, so any way of getting there counts.
 */
export interface StateCheck {
  label: string;
  path: string;
  expect: PathState;
  /** For a file: a text it must contain. */
  contains?: string | undefined;
}

/** Whether a check holds, given what the path is and, for a file, its text. */
export function checkHolds(check: StateCheck, state: PathState, text: string | null): boolean {
  if (state !== check.expect) return false;
  if (check.expect !== "file" || check.contains === undefined) return true;
  return text?.includes(check.contains) === true;
}
