"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { moderationRepository, prisma } from "@cyberlearn/db";
import { requireAdminAction } from "@/lib/auth";

/**
 * A person disagreeing, or not, with the machine.
 *
 * Neither outcome republishes or un-publishes anything on its own: a BLOCK
 * already refused the content and there is no copy of it to restore, and a
 * REVIEW already let it through. What this is for is knowing whether the filter
 * is any good - a column of OVERTURNED against one rule is the signal that the
 * rule is wrong, and it is the only way this ever gets tuned.
 */
export async function resolveModerationAction(
  eventId: string,
  outcome: "UPHELD" | "OVERTURNED",
): Promise<{ ok: boolean }> {
  const admin = await requireAdminAction();
  if (!z.string().uuid().safeParse(eventId).success) return { ok: false };

  await moderationRepository.resolve(eventId, outcome, admin.id);
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: outcome === "UPHELD" ? "moderation.upheld" : "moderation.overturned",
      targetType: "ModerationEvent",
      targetId: eventId,
      metadata: {},
    },
  });

  revalidatePath("/moderation");
  return { ok: true };
}
