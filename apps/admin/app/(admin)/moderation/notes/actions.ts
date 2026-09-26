"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { noteReportRepository, prisma } from "@cyberlearn/db";
import { requireAdminAction } from "@/lib/auth";

const schema = z.object({
  noteId: z.string().uuid(),
  outcome: z.enum(["UNSHARED", "DISMISSED"]),
});

/**
 * Settles every open report on one note.
 *
 * UNSHARED takes the note back from everybody it was shared with; the author
 * keeps it, and can share it again, which a new report would then bring back
 * here. DISMISSED leaves the shares as they are: the note was read and kept.
 * Either way the decision is logged, with how many reports and shares it
 * covered.
 */
export async function resolveNoteReportsAction(formData: FormData): Promise<void> {
  const admin = await requireAdminAction();
  const parsed = schema.safeParse({
    noteId: formData.get("noteId"),
    outcome: formData.get("outcome"),
  });
  if (!parsed.success) return;

  const { noteId, outcome } = parsed.data;
  const { reports, sharesRemoved } = await noteReportRepository.resolveNote(noteId, outcome);
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: outcome === "UNSHARED" ? "note.report.unshare" : "note.report.dismiss",
      targetType: "note",
      targetId: noteId,
      metadata: { reports, sharesRemoved },
    },
  });
  revalidatePath("/moderation/notes");
  revalidatePath("/moderation");
}
