import {
  checkFolderMove,
  folderAncestors,
  folderDepth,
  folderDescendants,
  NOTE_FOLDER_MAX_DEPTH,
  NOTE_FOLDERS_MAX,
  parentMap,
  type FolderMoveRefusal,
} from "@cyberlearn/lib/notes/workspace";
import { prisma } from "../prisma.js";
import { lockNotesOf, trashNotesTx } from "./note.repository.js";

/** A user's note folder, as listed in the notes library. */
export interface NoteFolderSummary {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  parentId: string | null;
  position: number;
}

const FOLDER_SELECT = {
  id: true,
  name: true,
  color: true,
  icon: true,
  parentId: true,
  position: true,
} as const;

export type CreateFolderRefusal = "limit" | "parent" | "depth";
export type MoveFolderRefusal = FolderMoveRefusal | "not-found";

export const noteFolderRepository = {
  /** Every folder for a user, in manual order (then oldest first). */
  async listForUser(userId: string): Promise<NoteFolderSummary[]> {
    return prisma.noteFolder.findMany({
      where: { userId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: FOLDER_SELECT,
    });
  },

  /**
   * Create a folder at the root or inside one of the user's folders, after
   * its siblings. Refused past NOTE_FOLDERS_MAX, under a folder that is not
   * the user's, or deeper than NOTE_FOLDER_MAX_DEPTH.
   */
  async create(
    userId: string,
    input: { name: string; color: string | null; icon: string | null; parentId: string | null },
  ): Promise<{ ok: true; folder: NoteFolderSummary } | { ok: false; reason: CreateFolderRefusal }> {
    return prisma.$transaction(async (tx) => {
      await lockNotesOf(tx, userId);
      const folders = await tx.noteFolder.findMany({
        where: { userId },
        select: { id: true, parentId: true },
      });
      if (folders.length >= NOTE_FOLDERS_MAX) return { ok: false, reason: "limit" } as const;
      if (input.parentId !== null) {
        if (!folders.some((f) => f.id === input.parentId)) {
          return { ok: false, reason: "parent" } as const;
        }
        if (folderDepth(parentMap(folders), input.parentId) >= NOTE_FOLDER_MAX_DEPTH) {
          return { ok: false, reason: "depth" } as const;
        }
      }
      const siblings = await tx.noteFolder.count({ where: { userId, parentId: input.parentId } });
      const folder = await tx.noteFolder.create({
        data: { userId, ...input, position: siblings },
        select: FOLDER_SELECT,
      });
      return { ok: true, folder } as const;
    });
  },

  /**
   * Update a folder the user owns (name, colour and/or icon). Scoped by userId so
   * a user can never edit another user's folder. Returns false when no row matched.
   */
  async update(
    userId: string,
    folderId: string,
    data: { name?: string; color?: string | null; icon?: string | null },
  ): Promise<boolean> {
    const res = await prisma.noteFolder.updateMany({
      where: { id: folderId, userId },
      data,
    });
    return res.count > 0;
  },

  /**
   * Move a folder under another of the user's folders, or to the root (null),
   * and to `position` among its new siblings (the end when omitted). Never
   * into itself or its own subtree, never past NOTE_FOLDER_MAX_DEPTH. The
   * account's tree is locked for the check and the write, so two moves cannot
   * cross into a cycle.
   */
  async move(
    userId: string,
    folderId: string,
    parentId: string | null,
    position?: number,
  ): Promise<{ ok: true } | { ok: false; reason: MoveFolderRefusal }> {
    return prisma.$transaction(async (tx) => {
      await lockNotesOf(tx, userId);
      const folders = await tx.noteFolder.findMany({
        where: { userId },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { id: true, parentId: true },
      });
      const ids = new Set(folders.map((f) => f.id));
      if (!ids.has(folderId) || (parentId !== null && !ids.has(parentId))) {
        return { ok: false, reason: "not-found" } as const;
      }
      const parents = parentMap(folders);
      const refusal = checkFolderMove(parents, folderId, parentId);
      if (refusal) return { ok: false, reason: refusal } as const;

      // Renumber the new siblings with the folder slotted in.
      const siblings = folders
        .filter((f) => f.id !== folderId && (parents.get(f.id) ?? null) === parentId)
        .map((f) => f.id);
      const at = Math.max(0, Math.min(position ?? siblings.length, siblings.length));
      siblings.splice(at, 0, folderId);
      await tx.noteFolder.update({ where: { id: folderId }, data: { parentId } });
      for (const [index, id] of siblings.entries()) {
        await tx.noteFolder.update({ where: { id }, data: { position: index } });
      }
      return { ok: true } as const;
    });
  },

  /**
   * Delete a folder the user owns.
   * - "lift": what it holds, notes and subfolders, moves up to its parent.
   * - "trash": its notes and those of its subfolders go to the trash, and
   *   the subfolders are deleted with it.
   * Returns the notes trashed, or null when the folder is not the user's.
   */
  async remove(
    userId: string,
    folderId: string,
    mode: "lift" | "trash" = "lift",
  ): Promise<{ trashed: number } | null> {
    return prisma.$transaction(async (tx) => {
      await lockNotesOf(tx, userId);
      const folders = await tx.noteFolder.findMany({
        where: { userId },
        select: { id: true, parentId: true },
      });
      if (!folders.some((f) => f.id === folderId)) return null;
      const parents = parentMap(folders);
      const parentId = parents.get(folderId) ?? null;

      if (mode === "lift") {
        await tx.noteFolder.updateMany({
          where: { userId, parentId: folderId },
          data: { parentId },
        });
        await tx.note.updateMany({ where: { userId, folderId }, data: { folderId: parentId } });
        await tx.noteFolder.delete({ where: { id: folderId } });
        return { trashed: 0 };
      }

      const subtree = [folderId, ...folderDescendants(parents, folderId)];
      const trashed = await trashNotesTx(tx, userId, { folderId: { in: subtree } });
      // Deepest first, so no parent goes before its child.
      const ordered = [...subtree].sort(
        (a, b) => folderAncestors(parents, b).length - folderAncestors(parents, a).length,
      );
      for (const id of ordered) await tx.noteFolder.delete({ where: { id } });
      return { trashed };
    });
  },

  /** Every folder the account made, for its GDPR export (rgpd/build-export.ts). */
  async exportFor(userId: string) {
    return prisma.noteFolder.findMany({
      where: { userId },
      select: { name: true, color: true, createdAt: true, parent: { select: { name: true } } },
    });
  },
};
