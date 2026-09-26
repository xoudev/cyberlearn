"use server";

import { z } from "zod";
import { noteRepository } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";

const MAX_CONTENT = 20_000;

const saveSchema = z.object({
  lessonId: z.string().uuid(),
  content: z.string().max(MAX_CONTENT),
});

export interface SaveNoteResult {
  ok: boolean;
  wordCount?: number;
  savedAt?: string;
  error?: string;
}

/** Rough markdown-aware word count for the "N mots" footer + library cards. */
function countWords(markdown: string): number {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/[#>*_`~\-[\]()!]/g, " ");
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Auto-save the current lesson's note. An empty note is deleted server-side. */
export async function saveNoteAction(input: {
  lessonId: string;
  content: string;
}): Promise<SaveNoteResult> {
  const user = await requireRequestUser();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Note invalide." };

  try {
    const wordCount = countWords(parsed.data.content);
    const saved = await noteRepository.upsert(
      user.id,
      parsed.data.lessonId,
      parsed.data.content,
      wordCount,
    );
    return {
      ok: true,
      wordCount: saved?.wordCount ?? 0,
      savedAt: (saved?.updatedAt ?? new Date()).toISOString(),
    };
  } catch {
    return { ok: false, error: "Enregistrement impossible." };
  }
}
