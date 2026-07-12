"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { noteFolderRepository, noteRepository } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { FOLDER_ICON_NAMES } from "../_components/notes-shared";

const nameSchema = z.string().trim().min(1).max(40);
// Hex colour from the fixed client palette (or null to clear it).
const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .nullable();
// Icon name from the fixed client set (or null for the default folder glyph).
const iconSchema = z.enum(FOLDER_ICON_NAMES).nullable();

const createSchema = z.object({
  name: nameSchema,
  color: colorSchema.optional(),
  icon: iconSchema.optional(),
});
const renameSchema = z.object({ folderId: z.string().uuid(), name: nameSchema });
const recolorSchema = z.object({ folderId: z.string().uuid(), color: colorSchema });
const reiconSchema = z.object({ folderId: z.string().uuid(), icon: iconSchema });
const deleteSchema = z.object({ folderId: z.string().uuid() });
const moveSchema = z.object({
  noteId: z.string().uuid(),
  folderId: z.string().uuid().nullable(),
});

export interface FolderResult {
  ok: boolean;
  folder?: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
    position: number;
  };
  error?: string;
}

/** Create a new folder for the current user. */
export async function createFolderAction(input: {
  name: string;
  color?: string | null;
  icon?: string | null;
}): Promise<FolderResult> {
  const user = await requireRequestUser();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Nom de dossier invalide." };
  try {
    const folder = await noteFolderRepository.create(
      user.id,
      parsed.data.name,
      parsed.data.color ?? null,
      parsed.data.icon ?? null,
    );
    revalidatePath("/notes");
    return { ok: true, folder };
  } catch {
    return { ok: false, error: "Création impossible." };
  }
}

/** Rename a folder the user owns. */
export async function renameFolderAction(input: {
  folderId: string;
  name: string;
}): Promise<{ ok: boolean }> {
  const user = await requireRequestUser();
  const parsed = renameSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const ok = await noteFolderRepository.update(user.id, parsed.data.folderId, {
    name: parsed.data.name,
  });
  if (ok) revalidatePath("/notes");
  return { ok };
}

/** Change a folder's accent colour (or clear it with null). */
export async function recolorFolderAction(input: {
  folderId: string;
  color: string | null;
}): Promise<{ ok: boolean }> {
  const user = await requireRequestUser();
  const parsed = recolorSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const ok = await noteFolderRepository.update(user.id, parsed.data.folderId, {
    color: parsed.data.color,
  });
  if (ok) revalidatePath("/notes");
  return { ok };
}

/** Change a folder's icon (or clear it to the default folder glyph with null). */
export async function reiconFolderAction(input: {
  folderId: string;
  icon: string | null;
}): Promise<{ ok: boolean }> {
  const user = await requireRequestUser();
  const parsed = reiconSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const ok = await noteFolderRepository.update(user.id, parsed.data.folderId, {
    icon: parsed.data.icon,
  });
  if (ok) revalidatePath("/notes");
  return { ok };
}

/** Delete a folder the user owns. Its notes are ungrouped, not deleted. */
export async function deleteFolderAction(input: {
  folderId: string;
}): Promise<{ ok: boolean }> {
  const user = await requireRequestUser();
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const ok = await noteFolderRepository.remove(user.id, parsed.data.folderId);
  if (ok) revalidatePath("/notes");
  return { ok };
}

/** Move a note into a folder, or out of any folder (folderId null). */
export async function moveNoteAction(input: {
  noteId: string;
  folderId: string | null;
}): Promise<{ ok: boolean }> {
  const user = await requireRequestUser();
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const ok = await noteRepository.moveToFolder(user.id, parsed.data.noteId, parsed.data.folderId);
  if (ok) revalidatePath("/notes");
  return { ok };
}
