/**
 * The rules of the notes workspace that do not need a database: its limits,
 * how a note is titled, and how folders nest. Shared by the repositories that
 * enforce them, the server actions that check input against them and the
 * library that shows them, so the three never disagree.
 */

/** The longest note the server keeps, in characters. */
export const NOTE_CONTENT_MAX = 20_000;
/** The longest title, in characters (the column is VARCHAR(120)). */
export const NOTE_TITLE_MAX = 120;
/** The longest folder name. */
export const NOTE_FOLDER_NAME_MAX = 40;
/** How deep folders nest: a root folder is depth 1. */
export const NOTE_FOLDER_MAX_DEPTH = 4;
/** Folders one account may hold. */
export const NOTE_FOLDERS_MAX = 300;
/** Notes one account may hold, the trash included. */
export const NOTES_MAX = 2_000;
/** Days a note stays in the trash before it is purged. */
export const NOTE_TRASH_DAYS = 30;
/** Flashcards one note may produce. */
export const NOTE_CARDS_PER_NOTE_MAX = 100;

/** What an import may bring in at once. */
export const NOTE_IMPORT_LIMITS = {
  /** Size of the file picked: a .md, or a .zip of them. */
  fileBytes: 5 * 1024 * 1024,
  /** Everything a .zip unpacks to, all files together. */
  unpackedBytes: 20 * 1024 * 1024,
  /** Entries a .zip may list (folders included). */
  entries: 1_000,
  /** Notes one import may create. */
  notes: 500,
} as const;

/** A note's title as shown: its own, else its lesson's, else a placeholder. */
export function noteDisplayTitle(title: string, lessonTitle: string | null | undefined): string {
  const own = title.trim();
  if (own) return own;
  const lesson = lessonTitle?.trim();
  if (lesson) return lesson;
  return "Note sans titre";
}

/** Clean a title typed or imported: one line, trimmed, within NOTE_TITLE_MAX. */
export function cleanNoteTitle(raw: string): string {
  return (
    raw
      // eslint-disable-next-line no-control-regex -- strip control characters from user input
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, NOTE_TITLE_MAX)
  );
}

export interface FolderNode {
  id: string;
  parentId: string | null;
}

/**
 * Folder id → its parent's id, with any parent that is not one of the user's
 * own folders read as the root (a row written over the Data API before the
 * policy checked parents could point anywhere).
 */
export function parentMap(folders: readonly FolderNode[]): Map<string, string | null> {
  const ids = new Set(folders.map((f) => f.id));
  return new Map(
    folders.map((f) => [f.id, f.parentId !== null && ids.has(f.parentId) ? f.parentId : null]),
  );
}

/** The folder's ancestors, from the root down to its parent. Stops on a cycle. */
export function folderAncestors(
  parents: ReadonlyMap<string, string | null>,
  folderId: string,
): string[] {
  const chain: string[] = [];
  const seen = new Set<string>([folderId]);
  let cur = parents.get(folderId) ?? null;
  while (cur !== null && !seen.has(cur)) {
    chain.unshift(cur);
    seen.add(cur);
    cur = parents.get(cur) ?? null;
  }
  return chain;
}

/** A folder's depth: 1 at the root. */
export function folderDepth(parents: ReadonlyMap<string, string | null>, folderId: string): number {
  return folderAncestors(parents, folderId).length + 1;
}

/** Every folder under `folderId`, at any depth (not the folder itself). */
export function folderDescendants(
  parents: ReadonlyMap<string, string | null>,
  folderId: string,
): Set<string> {
  const children = new Map<string, string[]>();
  for (const [id, parent] of parents) {
    if (parent === null) continue;
    const list = children.get(parent) ?? [];
    list.push(id);
    children.set(parent, list);
  }
  const out = new Set<string>();
  const queue = [...(children.get(folderId) ?? [])];
  // An array's iterator also visits what is pushed while it runs.
  for (const id of queue) {
    if (out.has(id) || id === folderId) continue;
    out.add(id);
    queue.push(...(children.get(id) ?? []));
  }
  return out;
}

/** How many levels a folder's subtree spans: 1 for a folder with no subfolder. */
export function subtreeHeight(
  parents: ReadonlyMap<string, string | null>,
  folderId: string,
): number {
  let height = 1;
  for (const id of folderDescendants(parents, folderId)) {
    const chain = folderAncestors(parents, id);
    const idx = chain.indexOf(folderId);
    if (idx >= 0) height = Math.max(height, chain.length - idx + 1);
  }
  return height;
}

export type FolderMoveRefusal = "self" | "cycle" | "depth";

/**
 * Whether `folderId` may move under `targetParentId` (null: the root). It may
 * not go into itself or one of its own subfolders, and the move may not push
 * any folder of its subtree past NOTE_FOLDER_MAX_DEPTH.
 */
export function checkFolderMove(
  parents: ReadonlyMap<string, string | null>,
  folderId: string,
  targetParentId: string | null,
): FolderMoveRefusal | null {
  if (targetParentId === null) {
    return subtreeHeight(parents, folderId) > NOTE_FOLDER_MAX_DEPTH ? "depth" : null;
  }
  if (targetParentId === folderId) return "self";
  if (folderDescendants(parents, folderId).has(targetParentId)) return "cycle";
  const depth = folderDepth(parents, targetParentId) + subtreeHeight(parents, folderId);
  return depth > NOTE_FOLDER_MAX_DEPTH ? "depth" : null;
}

/** The folder names from the root down to `folderId` itself. */
export function folderPath(
  folders: readonly (FolderNode & { name: string })[],
  folderId: string | null,
): string[] {
  if (folderId === null) return [];
  const byId = new Map(folders.map((f) => [f.id, f]));
  if (!byId.has(folderId)) return [];
  const parents = parentMap(folders);
  return [...folderAncestors(parents, folderId), folderId].map((id) => byId.get(id)?.name ?? "");
}
