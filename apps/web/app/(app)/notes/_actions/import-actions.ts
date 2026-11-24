"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { noteImportRepository } from "@cyberlearn/db";
import { countNoteWords } from "@cyberlearn/lib/notes/rich-markdown";
import {
  cleanNoteTitle,
  NOTE_CONTENT_MAX,
  NOTE_FOLDER_NAME_MAX,
  NOTES_MAX,
} from "@cyberlearn/lib/notes/workspace";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { requireRequestUser } from "@/lib/auth";
import { checkNoteImport } from "@/lib/rate-limit";

/**
 * The server side of an import. The browser unpacked the file
 * (lib/notes/import-file.ts); nothing it sends is trusted: every field is
 * checked again here, titles and folder names cleaned again, control
 * characters dropped again, and the repository enforces the account's caps.
 * Sent in batches under a server action's body limit, at most 100 notes each.
 */

const itemSchema = z.object({
  folders: z.array(z.string().max(NOTE_FOLDER_NAME_MAX * 4)).max(12),
  title: z.string().max(400),
  content: z.string().max(NOTE_CONTENT_MAX),
});
const batchSchema = z.object({
  targetFolderId: z.guid().nullable(),
  notes: z.array(itemSchema).min(1).max(100),
  /** The first batch of an import: the one the rate limit counts. */
  first: z.boolean(),
});

export type ImportNotesResult =
  | { ok: true; created: number; foldersCreated: number; flattened: number }
  | { ok: false; error: string };

// eslint-disable-next-line no-control-regex -- strip control characters from imported text
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

export async function importNotesAction(input: {
  targetFolderId: string | null;
  notes: { folders: string[]; title: string; content: string }[];
  first: boolean;
}): Promise<ImportNotesResult> {
  const user = await requireRequestUser();
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Fichier refusé : contenu invalide." };

  if (parsed.data.first) {
    const limit = await checkNoteImport(user.id);
    if (!limit.success) {
      return { ok: false, error: "Trop d'imports d'affilée. Réessaie dans quelques minutes." };
    }
  }

  const items = parsed.data.notes.map((n) => {
    const content = n.content.replace(/\r\n?/g, "\n").replace(CONTROL, "");
    return {
      folders: n.folders
        .map((f) => cleanNoteTitle(f).slice(0, NOTE_FOLDER_NAME_MAX).trim())
        .filter((f) => f !== "" && f !== "." && f !== ".."),
      title: cleanNoteTitle(n.title) || "Note importée",
      content,
      wordCount: countNoteWords(content),
    };
  });

  try {
    const res = await noteImportRepository.importBatch(user.id, parsed.data.targetFolderId, items);
    if (!res.ok) {
      return {
        ok: false,
        error:
          res.reason === "limit"
            ? `Import trop gros : ${String(NOTES_MAX)} notes au plus sur ton compte, corbeille comprise.`
            : "Le dossier de destination n'existe plus.",
      };
    }
    revalidatePath("/notes");
    return {
      ok: true,
      created: res.created,
      foldersCreated: res.foldersCreated,
      flattened: res.flattened,
    };
  } catch (err) {
    logger.error({ scope: "notes", err: errorMessage(err) }, "note import failed");
    return { ok: false, error: "Import impossible." };
  }
}
