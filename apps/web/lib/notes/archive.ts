import { strToU8, zipSync, type Zippable } from "fflate";
import { toPortableMarkdown } from "@cyberlearn/lib/notes/portable-markdown";
import { folderAncestors, parentMap } from "@cyberlearn/lib/notes/workspace";

/**
 * The .zip export of the notes workspace, built in the browser from what the
 * page already holds: nothing goes to a server, and a whole library of text
 * zips in a blink. The archive mirrors the folders: a folder is a directory,
 * a note a .md file named after its title, with a YAML header Obsidian, VS
 * Code or any static site generator reads (title, lesson, dates), and its
 * text in markdown those tools draw (portable-markdown.ts).
 */

/** The top directory of the whole-library export (the import drops it). */
export const ALL_NOTES_ROOT = "Cyber Learn - Notes";

export interface ArchiveNote {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  lessonTitle: string | null;
  lessonSlug: string | null;
  pathTitle: string | null;
  categoryLabel: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArchiveFolder {
  id: string;
  name: string;
  parentId: string | null;
}

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

/**
 * The dots and spaces ending a name, which Windows drops (and then cannot
 * open the file). A loop rather than `/[. ]+$/`, which retries a run of dots
 * from each of them.
 */
function trimDotsAndSpaces(name: string): string {
  let end = name.length;
  while (end > 0 && (name[end - 1] === "." || name[end - 1] === " ")) end--;
  return name.slice(0, end);
}

/**
 * A name every file system takes: no separators or characters Windows refuses,
 * no control characters, no trailing dot or space, not a reserved device name,
 * at most 80 characters. Never empty.
 */
export function safeFileName(input: string, fallback = "Sans titre"): string {
  let name = input
    .normalize("NFC")
    // eslint-disable-next-line no-control-regex -- control characters are not valid in file names
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");
  name = trimDotsAndSpaces(trimDotsAndSpaces(name).slice(0, 80));
  if (!name) name = fallback;
  if (WINDOWS_RESERVED.test(name)) name = `_${name}`;
  return name;
}

/** `base`, or `base (2)`, `base (3)`… whichever `taken` does not hold yet (case-insensitive). */
function unique(base: string, ext: string, taken: Set<string>): string {
  let candidate = `${base}${ext}`;
  for (let n = 2; taken.has(candidate.toLowerCase()); n += 1)
    candidate = `${base} (${String(n)})${ext}`;
  taken.add(candidate.toLowerCase());
  return candidate;
}

/** A YAML string: JSON's double-quoted form is valid YAML and escapes everything. */
function yamlString(value: string): string {
  return JSON.stringify(value);
}

/**
 * A note as a .md file: YAML header, then the note with the workspace's own
 * marks (colours, highlights, callouts) written the way other readers draw
 * them. The import reads them back.
 */
export function noteFileContent(note: ArchiveNote, siteUrl: string): string {
  const lines = ["---", `title: ${yamlString(note.title)}`];
  if (note.lessonTitle) lines.push(`lesson: ${yamlString(note.lessonTitle)}`);
  if (note.lessonSlug) {
    lines.push(
      `lesson_url: ${yamlString(`${siteUrl.replace(/\/$/, "")}/lessons/${note.lessonSlug}`)}`,
    );
  }
  if (note.pathTitle) lines.push(`path: ${yamlString(note.pathTitle)}`);
  if (note.categoryLabel) lines.push(`category: ${yamlString(note.categoryLabel)}`);
  lines.push(
    `created: ${note.createdAt}`,
    `updated: ${note.updatedAt}`,
    "source: Cyber Learn",
    "---",
    "",
  );
  return `${lines.join("\n")}\n${toPortableMarkdown(note.content).trimEnd()}\n`;
}

/**
 * The archive's files, path → content. `rootFolderId` exports one folder and
 * everything under it, the folder itself as the archive's top directory;
 * null exports every note, the notes outside any folder at the top.
 */
export function archiveEntries(input: {
  notes: readonly ArchiveNote[];
  folders: readonly ArchiveFolder[];
  rootFolderId: string | null;
  rootName: string;
  siteUrl: string;
}): Map<string, string> {
  const { notes, folders, rootFolderId, siteUrl } = input;
  const parents = parentMap(folders);
  const byId = new Map(folders.map((f) => [f.id, f]));

  // Each folder's directory path, from the export's root, made unique among siblings.
  const dirOf = new Map<string, string>();
  const takenIn = new Map<string, Set<string>>();
  const taken = (dir: string): Set<string> => {
    let set = takenIn.get(dir);
    if (!set) {
      set = new Set();
      takenIn.set(dir, set);
    }
    return set;
  };
  const root = safeFileName(input.rootName, "Notes");

  const dirFor = (folderId: string | null): string | null => {
    if (folderId === null) return rootFolderId === null ? root : null;
    if (folderId === rootFolderId) return root;
    const cached = dirOf.get(folderId);
    if (cached !== undefined) return cached;
    const chain = folderAncestors(parents, folderId);
    if (rootFolderId !== null && !chain.includes(rootFolderId)) return null;
    const parentId = parents.get(folderId) ?? null;
    const parentDir = dirFor(parentId);
    if (parentDir === null) return null;
    const name = unique(
      safeFileName(byId.get(folderId)?.name ?? "", "Dossier"),
      "",
      taken(parentDir),
    );
    const dir = `${parentDir}/${name}`;
    dirOf.set(folderId, dir);
    return dir;
  };

  const files = new Map<string, string>();
  // Folders first, in their order, so empty ones still appear as directories.
  for (const folder of folders) {
    const dir = dirFor(folder.id);
    if (dir !== null && dir !== root) files.set(`${dir}/`, "");
  }
  const sorted = [...notes].sort((a, b) => a.title.localeCompare(b.title, "fr"));
  for (const note of sorted) {
    const dir = dirFor(note.folderId);
    if (dir === null) continue;
    const file = unique(safeFileName(note.title), ".md", taken(dir));
    files.set(`${dir}/${file}`, noteFileContent(note, siteUrl));
  }
  return files;
}

/** The archive itself, zipped. */
export function buildNotesZip(input: Parameters<typeof archiveEntries>[0]): Uint8Array {
  const entries = archiveEntries(input);
  const zippable: Zippable = {};
  const mtime = new Date();
  for (const [path, content] of entries) {
    if (path.endsWith("/")) {
      zippable[path] = [new Uint8Array(0), { mtime }];
    } else {
      zippable[path] = [strToU8(content), { mtime, level: 6 }];
    }
  }
  return zipSync(zippable);
}

/** Start a download of `bytes` as `fileName`, from a user gesture. */
export function downloadBytes(bytes: Uint8Array | Blob, fileName: string, type: string): void {
  // fflate's Uint8Array is typed over ArrayBufferLike, which BlobPart does not
  // list; it is a plain ArrayBuffer at runtime.
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
