import { prisma } from "../prisma.js";

/** A user's note folder, as listed in the notes library. */
export interface NoteFolderSummary {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  position: number;
}

const FOLDER_SELECT = {
  id: true,
  name: true,
  color: true,
  icon: true,
  position: true,
} as const;

export const noteFolderRepository = {
  /** Every folder for a user, in manual order (then newest last). */
  async listForUser(userId: string): Promise<NoteFolderSummary[]> {
    return prisma.noteFolder.findMany({
      where: { userId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: FOLDER_SELECT,
    });
  },

  /** Create a folder, appended after the user's existing folders. */
  async create(
    userId: string,
    name: string,
    color: string | null,
    icon: string | null,
  ): Promise<NoteFolderSummary> {
    const count = await prisma.noteFolder.count({ where: { userId } });
    return prisma.noteFolder.create({
      data: { userId, name, color, icon, position: count },
      select: FOLDER_SELECT,
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
   * Delete a folder the user owns. The notes.folderId FK is ON DELETE SET NULL,
   * so the folder's notes are ungrouped, not deleted. Returns false when no row
   * matched (wrong owner or missing folder).
   */
  async remove(userId: string, folderId: string): Promise<boolean> {
    const res = await prisma.noteFolder.deleteMany({
      where: { id: folderId, userId },
    });
    return res.count > 0;
  },
};
