import { unzipSync, type UnzipFileInfo } from "fflate";
import {
  cleanNoteTitle,
  NOTE_CONTENT_MAX,
  NOTE_FOLDER_NAME_MAX,
  NOTE_IMPORT_LIMITS,
} from "@cyberlearn/lib/notes/workspace";
import { ALL_NOTES_ROOT } from "./archive";

/**
 * Reading an import in the browser: a .md (or .txt) note, or a .zip of them
 * whose directories become folders. Nothing in the file is ever run or parsed
 * as markup; what comes out is plain text the server checks again
 * (import-actions.ts), so this is about not choking the tab, not about trust.
 *
 * What it guards against:
 * - size: the picked file, every entry's announced size, the total unpacked,
 *   the number of entries (NOTE_IMPORT_LIMITS). fflate inflates an entry into
 *   a buffer of its announced size, so a header lying low yields a truncated
 *   entry, not a bomb, and a truncated one fails the UTF-8 check below;
 * - content: UTF-8 only (fatal decoding), control characters dropped;
 * - names: directory names are cleaned into folder names (no "." or ".."
 *   segment survives), hidden files and macOS resource forks skipped;
 * - the header: only a `title:` line is read from YAML front matter, by a
 *   regex. No YAML parser runs on it (gray-matter, for one, would execute a
 *   `---js` header).
 */

export interface ImportedNote {
  /** The folders it sits in, from the import's root down. */
  folders: string[];
  title: string;
  content: string;
}

export interface ImportReading {
  notes: ImportedNote[];
  /** Entries left out, with why, for the dialog to list. */
  skipped: { name: string; reason: string }[];
}

export class ImportError extends Error {}

const TEXT_EXT = /\.(md|markdown|txt)$/i;
const decoder = new TextDecoder("utf-8", { fatal: true });

/** Bytes as UTF-8 text, or null when they are not valid UTF-8. */
function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    return decoder.decode(bytes);
  } catch {
    return null;
  }
}

/** Clean text: no BOM, \n line ends, no control characters but tab and newline. */
export function cleanImportedText(text: string): string {
  return (
    text
      .replace(/^\uFEFF/, "")
      .replace(/\r\n?/g, "\n")
      // eslint-disable-next-line no-control-regex -- strip control characters from an imported file
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
  );
}

/** A folder name from a directory name: one line, within NOTE_FOLDER_NAME_MAX. */
function folderName(segment: string): string {
  return cleanNoteTitle(segment).slice(0, NOTE_FOLDER_NAME_MAX).trim();
}

/** The title in YAML front matter, if any, and the content without the header. */
export function splitFrontMatter(text: string): { title: string | null; body: string } {
  if (!text.startsWith("---\n")) return { title: null, body: text };
  const end = text.indexOf("\n---", 4);
  if (end < 0 || end > 4000) return { title: null, body: text };
  const header = text.slice(4, end);
  const after = text.slice(end + 4).replace(/^[^\n]*\n/, "");
  const m = /^title:\s*(.+)$/m.exec(header);
  let title: string | null = null;
  if (m) {
    const raw = (m[1] ?? "").trim();
    if (raw.startsWith('"')) {
      try {
        const parsed: unknown = JSON.parse(raw);
        title = typeof parsed === "string" ? parsed : null;
      } catch {
        title = raw.slice(1, -1);
      }
    } else {
      title = raw.replace(/^'(.*)'$/, "$1");
    }
  }
  return { title, body: after.replace(/^\n+/, "") };
}

/** A note from one file's name and text. */
export function noteFromText(fileName: string, text: string, folders: string[]): ImportedNote {
  const cleaned = cleanImportedText(text);
  const { title: fmTitle, body } = splitFrontMatter(cleaned);
  const heading = /^#\s+(.+)$/m.exec(body)?.[1];
  const base = fileName.replace(/^.*[\\/]/, "").replace(TEXT_EXT, "");
  const title = cleanNoteTitle(fmTitle ?? heading ?? base) || "Note importée";
  return { folders, title, content: body };
}

/** Read a .md/.txt or a .zip picked by the learner. Throws ImportError on a refused file. */
export async function readImportFile(file: File): Promise<ImportReading> {
  if (file.size > NOTE_IMPORT_LIMITS.fileBytes) {
    throw new ImportError("Fichier trop lourd : 5 Mo au plus.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const skipped: ImportReading["skipped"] = [];

  if (TEXT_EXT.test(file.name)) {
    const text = decodeUtf8(bytes);
    if (text === null) throw new ImportError("Ce fichier n'est pas du texte UTF-8.");
    const note = noteFromText(file.name, text, []);
    if (note.content.length > NOTE_CONTENT_MAX) {
      throw new ImportError(
        `Note trop longue : ${NOTE_CONTENT_MAX.toLocaleString("fr-FR")} caractères au plus.`,
      );
    }
    return { notes: [note], skipped };
  }

  if (!/\.zip$/i.test(file.name)) {
    throw new ImportError("Formats acceptés : .md, .markdown, .txt ou .zip.");
  }
  // Zip signature: local file header, or an empty archive's end record.
  if (!(bytes[0] === 0x50 && bytes[1] === 0x4b))
    throw new ImportError("Ce fichier n'est pas un .zip valide.");

  let entries = 0;
  let unpacked = 0;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, {
      filter: (info: UnzipFileInfo) => {
        entries += 1;
        if (entries > NOTE_IMPORT_LIMITS.entries) {
          throw new ImportError(
            `Archive trop fournie : ${String(NOTE_IMPORT_LIMITS.entries)} fichiers au plus.`,
          );
        }
        const name = info.name;
        const base = name.replace(/^.*\//, "");
        if (name.endsWith("/") || name.startsWith("__MACOSX/") || base.startsWith("."))
          return false;
        if (!TEXT_EXT.test(name)) {
          skipped.push({ name, reason: "pas une note (.md, .txt)" });
          return false;
        }
        // UTF-8 takes four bytes a character at most.
        if (info.originalSize > NOTE_CONTENT_MAX * 4) {
          skipped.push({ name, reason: "trop longue" });
          return false;
        }
        unpacked += info.originalSize;
        if (unpacked > NOTE_IMPORT_LIMITS.unpackedBytes) {
          throw new ImportError("Archive trop volumineuse une fois décompressée : 20 Mo au plus.");
        }
        return true;
      },
    });
  } catch (err) {
    if (err instanceof ImportError) throw err;
    throw new ImportError("Archive illisible ou endommagée.");
  }

  const notes: ImportedNote[] = [];
  for (const [path, data] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b, "fr"))) {
    const text = decodeUtf8(data);
    if (text === null) {
      skipped.push({ name: path, reason: "pas du texte UTF-8" });
      continue;
    }
    const segments = path
      .split("/")
      .slice(0, -1)
      .filter((s) => s !== "" && s !== "." && s !== "..")
      .map(folderName)
      .filter(Boolean);
    const note = noteFromText(path, text, segments);
    if (note.content.length > NOTE_CONTENT_MAX) {
      skipped.push({ name: path, reason: "trop longue" });
      continue;
    }
    notes.push(note);
    if (notes.length > NOTE_IMPORT_LIMITS.notes) {
      throw new ImportError(`${String(NOTE_IMPORT_LIMITS.notes)} notes au plus par import.`);
    }
  }

  // The whole-library export wraps everything in ALL_NOTES_ROOT: that is the
  // archive's name, not a folder of the learner's, so it is dropped. A folder's
  // own export keeps its top directory: it is that folder, recreated.
  if (notes.length > 0 && notes.every((n) => n.folders[0] === ALL_NOTES_ROOT)) {
    for (const n of notes) n.folders = n.folders.slice(1);
  }
  return { notes, skipped };
}

/** Split notes into batches whose JSON stays under `maxBytes` (a server action's body limit). */
export function importBatches(
  notes: readonly ImportedNote[],
  maxBytes = 700_000,
): ImportedNote[][] {
  const batches: ImportedNote[][] = [];
  let current: ImportedNote[] = [];
  let size = 0;
  for (const note of notes) {
    const weight = new TextEncoder().encode(JSON.stringify(note)).length + 8;
    if (current.length > 0 && (size + weight > maxBytes || current.length >= 100)) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(note);
    size += weight;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}
