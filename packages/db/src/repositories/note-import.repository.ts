import {
  folderDepth,
  NOTE_FOLDER_MAX_DEPTH,
  NOTE_FOLDERS_MAX,
  NOTES_MAX,
  parentMap,
} from "@cyberlearn/lib/notes/workspace";
import { prisma } from "../prisma.js";
import { lockNotesOf } from "./note.repository.js";

/** One note of an import, already cleaned and checked by the caller. */
export interface ImportItem {
  /** Folder names from the import's root down; created when missing. */
  folders: string[];
  title: string;
  content: string;
  wordCount: number;
}

export type ImportBatchResult =
  | {
      ok: true;
      created: number;
      foldersCreated: number;
      /** Notes whose folders ran past NOTE_FOLDER_MAX_DEPTH or NOTE_FOLDERS_MAX, filed higher up. */
      flattened: number;
    }
  | { ok: false; reason: "limit" | "folder" };

const fold = (s: string): string => s.normalize("NFC").toLowerCase().trim();

export const noteImportRepository = {
  /**
   * Write one batch of an import under `targetFolderId` (null: the root). A
   * folder path reuses the user's folder of that name where there is one, so
   * an import sent in several batches, or twice, files into the same tree.
   * A path deeper than NOTE_FOLDER_MAX_DEPTH allows is cut at the deepest
   * level allowed; past NOTE_FOLDERS_MAX no folder is created and the note
   * stays in the last folder reached. Refused whole when the notes would pass
   * NOTES_MAX or the target folder is not the user's.
   */
  async importBatch(
    userId: string,
    targetFolderId: string | null,
    items: readonly ImportItem[],
  ): Promise<ImportBatchResult> {
    return prisma.$transaction(
      async (tx) => {
        await lockNotesOf(tx, userId);
        const folders = await tx.noteFolder.findMany({
          where: { userId },
          select: { id: true, parentId: true, name: true },
        });
        if (targetFolderId !== null && !folders.some((f) => f.id === targetFolderId)) {
          return { ok: false, reason: "folder" } as const;
        }
        const noteCount = await tx.note.count({ where: { userId } });
        if (noteCount + items.length > NOTES_MAX) return { ok: false, reason: "limit" } as const;

        const parents = parentMap(folders);
        const children = new Map<string, Map<string, string>>(); // parent key → folded name → id
        const keyOf = (parentId: string | null): string => parentId ?? "";
        for (const f of folders) {
          const key = keyOf(parents.get(f.id) ?? null);
          const map = children.get(key) ?? new Map<string, string>();
          if (!map.has(fold(f.name))) map.set(fold(f.name), f.id);
          children.set(key, map);
        }
        let folderTotal = folders.length;
        let foldersCreated = 0;
        let flattened = 0;
        const baseDepth = targetFolderId === null ? 0 : folderDepth(parents, targetFolderId);
        const room = NOTE_FOLDER_MAX_DEPTH - baseDepth;

        const data: {
          userId: string;
          title: string;
          content: string;
          wordCount: number;
          folderId: string | null;
        }[] = [];
        for (const item of items) {
          let parentId = targetFolderId;
          const path = item.folders.slice(0, Math.max(0, room));
          let cut = path.length < item.folders.length;
          for (const name of path) {
            const siblings = children.get(keyOf(parentId)) ?? new Map<string, string>();
            const existing = siblings.get(fold(name));
            if (existing) {
              parentId = existing;
              continue;
            }
            if (folderTotal >= NOTE_FOLDERS_MAX) {
              cut = true;
              break;
            }
            const position = siblings.size;
            const created = await tx.noteFolder.create({
              data: { userId, name, parentId, position },
              select: { id: true },
            });
            siblings.set(fold(name), created.id);
            children.set(keyOf(parentId), siblings);
            folderTotal += 1;
            foldersCreated += 1;
            parentId = created.id;
          }
          if (cut) flattened += 1;
          data.push({
            userId,
            title: item.title,
            content: item.content,
            wordCount: item.wordCount,
            folderId: parentId,
          });
        }
        const res = await tx.note.createMany({ data });
        return { ok: true, created: res.count, foldersCreated, flattened } as const;
      },
      { timeout: 20_000 },
    );
  },
};
