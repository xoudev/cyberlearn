"use server";

import { z } from "zod";
import { requireAdminAction } from "@/lib/auth";
import { applyLessonUpdate } from "@/lib/services/lesson-sync.service";

const inputSchema = z.object({
  refCode: z.string().regex(/^CL-LSN-\d{3}-V\d{2}$/),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
});

export type SyncActionResult = { ok: true } | { ok: false; message: string; details: string[] };

/**
 * Updates one lesson from its file in the repository.
 *
 * Only the refCode and the fingerprint the admin saw come from the browser:
 * the content is read from the repository on the server, never sent. No
 * revalidation here: "update all" calls this once per lesson, and the page
 * refreshes itself once at the end rather than rebuilding every diff each time.
 */
export async function updateLessonFromRepositoryAction(input: {
  refCode: string;
  hash: string;
}): Promise<SyncActionResult> {
  const admin = await requireAdminAction();
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Demande invalide.", details: [] };

  const result = await applyLessonUpdate(parsed.data.refCode, parsed.data.hash, admin.id);
  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      details: (result.errors ?? []).map((e) =>
        e.field ? `${e.field} : ${e.message}` : e.message,
      ),
    };
  }
  return { ok: true };
}
