import { z } from "zod";

/**
 * The Linux machine a CTF challenge is played on: the same machine as the
 * lessons' real terminal (<LinuxTerminal>, v86 in the browser), with files
 * prepared in /mnt, one of them holding the flag.
 *
 * The machine runs in the learner's browser, so whatever it holds can be read
 * by digging into the page. The flag is therefore the learner's own: authors
 * write {{FLAG}} where it goes, and the server puts in its place a flag
 * computed from the challenge and the learner (apps/web/lib/challenges/flag.ts).
 * A flag found in someone else's machine is worth nothing in yours.
 */

/** Where the learner's flag goes, in the content of the machine's files. */
export const FLAG_PLACEHOLDER = "{{FLAG}}";

/**
 * The same flag, written so that finding it takes a command more: base64
 * (`base64 -d`) or hexadecimal (`xxd -r -p`), both in the machine's BusyBox.
 * The learner submits the flag itself, decoded.
 */
export const FLAG_BASE64_PLACEHOLDER = "{{FLAG_BASE64}}";
export const FLAG_HEX_PLACEHOLDER = "{{FLAG_HEX}}";

const PLACEHOLDERS = [FLAG_PLACEHOLDER, FLAG_BASE64_PLACEHOLDER, FLAG_HEX_PLACEHOLDER];

/** Two hexadecimal digits per character: the flag is ASCII, one byte each. */
function asciiHex(text: string): string {
  let hex = "";
  for (let i = 0; i < text.length; i++) hex += text.charCodeAt(i).toString(16).padStart(2, "0");
  return hex;
}

/** The flag as each placeholder writes it. The flag is ASCII: btoa takes it. */
function encodings(flag: string): Record<string, string> {
  return {
    [FLAG_PLACEHOLDER]: flag,
    [FLAG_BASE64_PLACEHOLDER]: btoa(flag),
    [FLAG_HEX_PLACEHOLDER]: asciiHex(flag),
  };
}

/**
 * A file path in the machine, relative to /mnt: names separated by slashes. No
 * "." or "..", no leading slash. The directories are typed into the shell,
 * quoted, but still kept to plain names: a directory that needs quoting to be
 * safe is not one a lesson should use. The file's own name is written by v86
 * over 9p, never by the shell, so it may also hold spaces or start with a dash:
 * "rapport final.txt" and "-notes.txt" are what the lessons on quoting and on
 * "--" are about. A name may start with a dot: hidden files are part of what
 * the lessons teach.
 *
 * Shared by the lessons' terminal and the challenges' machine.
 */
const PLAIN_NAME = /^[A-Za-z0-9_.][A-Za-z0-9_.-]*$/;
const FILE_NAME = /^[A-Za-z0-9_.-](?:[A-Za-z0-9_. -]*[A-Za-z0-9_.-])?$/;

export function isLessonFilePath(path: string): boolean {
  const parts = path.split("/");
  const name = parts.pop() ?? "";
  if (!FILE_NAME.test(name) || name === "." || name === "..") return false;
  return parts.every((part) => PLAIN_NAME.test(part) && part !== "." && part !== "..");
}

export const challengeMachineSchema = z.object({
  /** Shown above the terminal. */
  title: z.string().trim().min(1).max(120).optional(),
  /** Files placed in /mnt before the learner starts: path → text content. */
  files: z
    .record(z.string(), z.string().max(64 * 1024))
    .refine((f) => Object.keys(f).length > 0, "La machine n'a aucun fichier.")
    .refine((f) => Object.keys(f).length <= 40, "Au plus 40 fichiers.")
    .refine(
      (f) => Object.keys(f).every(isLessonFilePath),
      "Chemin de fichier invalide : des noms séparés par des /, sans . ni .., sans / au début.",
    )
    .refine(
      (f) => Object.values(f).some((content) => PLACEHOLDERS.some((p) => content.includes(p))),
      `Aucun fichier ne contient ${FLAG_PLACEHOLDER} (ni ${FLAG_BASE64_PLACEHOLDER}, ni ${FLAG_HEX_PLACEHOLDER}) : le flag de l'élève n'aurait nulle part où aller.`,
    ),
});

export type ChallengeMachine = z.infer<typeof challengeMachineSchema>;

export type ChallengeMachineResult =
  | { ok: true; machine: ChallengeMachine }
  | { ok: false; problem: string };

/** Reads a stored or submitted machine, or says in French what is wrong with it. */
export function parseChallengeMachine(raw: unknown): ChallengeMachineResult {
  const parsed = challengeMachineSchema.safeParse(raw);
  if (parsed.success) return { ok: true, machine: parsed.data };
  return { ok: false, problem: parsed.error.issues[0]?.message ?? "Machine invalide." };
}

/** The machine's files with the learner's flag wherever the author put a placeholder. */
export function machineFilesWithFlag(
  machine: ChallengeMachine,
  flag: string,
): Record<string, string> {
  const written = Object.entries(encodings(flag));
  return Object.fromEntries(
    Object.entries(machine.files).map(([path, content]) => [
      path,
      written.reduce((text, [placeholder, value]) => text.split(placeholder).join(value), content),
    ]),
  );
}
