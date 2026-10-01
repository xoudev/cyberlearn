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
 * A lesson file path, relative to LESSON_DIR: names separated by slashes. No
 * "." or "..", no leading slash. The directories are typed into the shell by
 * setupCommand, quoted, but still kept to plain names: a directory that needs
 * quoting to be safe is not one a lesson should use. The file's own name is
 * written by v86 over 9p, never by the shell, so it may also hold spaces or
 * start with a dash: "rapport final.txt" and "-notes.txt" are what the
 * lessons on quoting and on "--" are about. A name may start with a dot:
 * hidden files are part of what the lessons teach.
 */
const PLAIN_NAME = /^[A-Za-z0-9_.][A-Za-z0-9_.-]*$/;
const FILE_NAME = /^[A-Za-z0-9_.-](?:[A-Za-z0-9_. -]*[A-Za-z0-9_.-])?$/;

export function isLessonFilePath(path: string): boolean {
  const parts = path.split("/");
  const name = parts.pop() ?? "";
  if (!FILE_NAME.test(name) || name === "." || name === "..") return false;
  return parts.every((part) => PLAIN_NAME.test(part) && part !== "." && part !== "..");
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
 * The links every Linux has in /dev, made at boot by udev or systemd, which
 * this image lacks: without /dev/fd, bash's process substitution, < <(...),
 * fails, and so does a script that writes to /dev/stderr.
 */
const DEV_LINKS = [
  "ln -s /proc/self/fd /dev/fd",
  "ln -s /proc/self/fd/0 /dev/stdin",
  "ln -s /proc/self/fd/1 /dev/stdout",
  "ln -s /proc/self/fd/2 /dev/stderr",
];

/**
 * The one line the page types into the fresh shell before handing it over:
 * the terminal's real size (the shell assumes 80 columns and would wrap lines
 * in the wrong place), the standard links of /dev, the lesson's directories,
 * then the lesson directory, and a clear screen. The files themselves are
 * written from the page once the directories exist.
 */
export function setupCommand(paths: readonly string[], cols: number, rows: number): string {
  const dirs = directoriesOf(paths).map((d) => `'${LESSON_DIR}/${d}'`);
  const steps = [`stty cols ${String(cols)} rows ${String(rows)}`, ...DEV_LINKS];
  if (dirs.length > 0) steps.push(`mkdir -p ${dirs.join(" ")}`);
  steps.push(`cd ${LESSON_DIR}`, "clear");
  return `${steps.join("; ")}\n`;
}

/**
 * The image has BusyBox's ash, not bash. A static bash is served next to it
 * and written into /mnt under this name once the shell is up; the line below
 * moves it to /bin, so #!/bin/bash scripts run and the lesson directory
 * shows only the lesson's files.
 *
 * The root filesystem is capped at half the machine's memory, about 16 MB,
 * and the image already fills all but 1.7 MB of it: the cap is raised first,
 * or the copy stops halfway. A copy that fails anyway leaves no /bin/bash
 * rather than a truncated one.
 *
 * The image has no terminal database either, and without one bash's line
 * editor treats the screen as a dumb terminal and scrolls long lines
 * sideways: Debian's compiled entry for the machine's TERM, linux, is served
 * too and copied into /lib/terminfo. ~/.bashrc gives an interactive bash a
 * prompt that ends like ash's, which is what the page waits for before
 * looking at the learner's work, and turns bracketed paste off, so a pasted
 * command reaches the page as plain keys, as it does under ash.
 */
export const BASH_FILE = ".bash";
export const TERMINFO_FILE = ".terminfo";

export function installBashCommand(withTerminfo: boolean): string {
  const bash = `${LESSON_DIR}/${BASH_FILE}`;
  const terminfo = `${LESSON_DIR}/${TERMINFO_FILE}`;
  const steps = [
    "mount -o remount,size=24m /",
    `cp ${bash} /bin/bash && chmod 755 /bin/bash || rm -f /bin/bash`,
  ];
  if (withTerminfo) steps.push(`mkdir -p /lib/terminfo/l && cp ${terminfo} /lib/terminfo/l/linux`);
  steps.push(
    `rm -f ${bash} ${terminfo}`,
    `printf '%s\\n' "PS1='bash \\W% '" "bind 'set enable-bracketed-paste off'" > /root/.bashrc`,
  );
  return steps.join("; ");
}

/** The shell's prompt ends every command: "~% ", "/mnt% ", "bash mnt% ". */
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
export type PathState = "file" | "dir" | "link" | "absent";

/** What the machine says about one path. */
export interface PathObservation {
  state: PathState;
  /** A file's text. */
  text: string | null;
  /** Permission bits in octal, "640" or "4755"; null when unknown. */
  mode: string | null;
  /** A symbolic link's target, as it was written. */
  target: string | null;
  /** How many names the inode has: 2 once a hard link is made. */
  links: number | null;
}

/**
 * One thing the exercise asks the learner to leave behind: a path that must
 * be a file (optionally containing a text), a directory, a symbolic link, or
 * nothing at all, with, if asked, given permissions or a number of hard links.
 * Checked in the machine itself, so any way of getting there counts.
 */
export interface StateCheck {
  label: string;
  path: string;
  expect: PathState;
  /** For a file: a text it must contain. */
  contains?: string | undefined;
  /** Permission bits in octal, as chmod takes them: "640", "750", "4755". */
  mode?: string | undefined;
  /** For a link: the target it must point to, as written by ln -s. */
  target?: string | undefined;
  /** The number of hard links the path must have. */
  links?: number | undefined;
}

/** Permission bits in octal, without leading zeros beyond three digits. */
export function octalMode(mode: number): string {
  return (mode & 0o7777).toString(8).padStart(3, "0");
}

/** Whether a check holds, given what the machine says about its path. */
export function checkHolds(check: StateCheck, seen: PathObservation): boolean {
  if (seen.state !== check.expect) return false;
  if (check.contains !== undefined && seen.text?.includes(check.contains) !== true) return false;
  if (check.mode !== undefined && seen.mode !== check.mode.replace(/^0+(?=\d{3})/, "")) {
    return false;
  }
  if (check.target !== undefined && seen.target !== check.target) return false;
  if (check.links !== undefined && seen.links !== check.links) return false;
  return true;
}
