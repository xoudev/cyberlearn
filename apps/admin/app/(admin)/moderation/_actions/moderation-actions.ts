"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { moderationRepository, prisma } from "@cyberlearn/db";
import { requireAdminAction } from "@/lib/auth";

/**
 * A person deciding what happens to content the screen took down.
 *
 * Both outcomes now reach the content, which is the point of reviewing it:
 * OVERTURNED - the screen was wrong - lifts the block and the message goes back
 * where its author put it; UPHELD - the screen was right - destroys it, rather
 * than leaving it hidden forever in a queue that only grows.
 *
 * The audit row records which it was and whether the content was actually
 * touched, because "upheld" against a row whose content had already been
 * deleted by its author is a different event from one that destroyed something.
 */
export async function resolveModerationAction(
  eventId: string,
  outcome: "UPHELD" | "OVERTURNED",
): Promise<{ ok: boolean }> {
  const admin = await requireAdminAction();
  if (!z.string().uuid().safeParse(eventId).success) return { ok: false };

  const applied = await moderationRepository.applyOutcome(eventId, outcome, admin.id);
  // Somebody else got there first. Nothing was changed and nothing is logged:
  // the decision that counts is already recorded under their name.
  if (!applied.claimed) return { ok: false };

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: outcome === "UPHELD" ? "moderation.upheld" : "moderation.overturned",
      targetType: "ModerationEvent",
      targetId: eventId,
      metadata: { contentTouched: applied.contentTouched },
    },
  });

  revalidatePath("/moderation");
  return { ok: true };
}
