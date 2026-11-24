"use server";

import { z } from "zod";
import { noteFolderRepository } from "@cyberlearn/db";
import {
  NOTE_FOLDER_MAX_DEPTH,
  NOTE_FOLDER_NAME_MAX,
  NOTE_FOLDERS_MAX,
} from "@cyberlearn/lib/notes/workspace";
import { requireRequestUser } from "@/lib/auth";
import { FOLDER_ICON_NAMES } from "../_components/notes-shared";

const nameSchema = z.string().trim().min(1).max(NOTE_FOLDER_NAME_MAX);
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
  parentId: z.guid().nullable().optional(),
});
const renameSchema = z.object({ folderId: z.guid(), name: nameSchema });
const recolorSchema = z.object({ folderId: z.guid(), color: colorSchema });
const reiconSchema = z.object({ folderId: z.guid(), icon: iconSchema });
const deleteSchema = z.object({ folderId: z.guid(), mode: z.enum(["lift", "trash"]) });
const moveFolderSchema = z.object({
  folderId: z.guid(),
  parentId: z.guid().nullable(),
  position: z.number().int().min(0).max(NOTE_FOLDERS_MAX).optional(),
});

export interface FolderResult {
  ok: boolean;
  folder?: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
    parentId: string | null;
    position: number;
  };
  error?: string;
}

/** Create a new folder for the current user. */
export async function createFolderAction(input: {
  name: string;
  color?: string | null;
  icon?: string | null;
  parentId?: string | null;
}): Promise<FolderResult> {
  const user = await requireRequestUser();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Nom de dossier invalide." };
  try {
    const res = await noteFolderRepository.create(user.id, {
      name: parsed.data.name,
      color: parsed.data.color ?? null,
      icon: parsed.data.icon ?? null,
      parentId: parsed.data.parentId ?? null,
    });
    if (!res.ok) {
      const error = {
        limit: `${String(NOTE_FOLDERS_MAX)} dossiers au plus.`,
        parent: "Ce dossier parent n'existe plus.",
        depth: `${String(NOTE_FOLDER_MAX_DEPTH)} niveaux de dossiers au plus.`,
      }[res.reason];
      return { ok: false, error };
    }
    return { ok: true, folder: res.folder };
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
  return { ok };
}

/**
 * Delete a folder the user owns. "lift" moves what it holds up to its parent;
 * "trash" sends its notes, subfolders included, to the trash.
 */
export async function deleteFolderAction(input: {
  folderId: string;
  mode: "lift" | "trash";
}): Promise<{ ok: boolean; trashed: number }> {
  const user = await requireRequestUser();
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, trashed: 0 };
  const res = await noteFolderRepository.remove(user.id, parsed.data.folderId, parsed.data.mode);
  return { ok: res !== null, trashed: res?.trashed ?? 0 };
}

/** Move a folder under another (or to the root), at a position among its siblings. */
export async function moveFolderAction(input: {
  folderId: string;
  parentId: string | null;
  position?: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireRequestUser();
  const parsed = moveFolderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Déplacement invalide." };
  const res = await noteFolderRepository.move(
    user.id,
    parsed.data.folderId,
    parsed.data.parentId,
    parsed.data.position,
  );
  if (!res.ok) {
    const error = {
      self: "Un dossier ne peut pas aller dans lui-même.",
      cycle: "Un dossier ne peut pas aller dans l'un de ses sous-dossiers.",
      depth: `${String(NOTE_FOLDER_MAX_DEPTH)} niveaux de dossiers au plus.`,
      "not-found": "Ce dossier n'existe plus.",
    }[res.reason];
    return { ok: false, error };
  }
  return { ok: true };
}
