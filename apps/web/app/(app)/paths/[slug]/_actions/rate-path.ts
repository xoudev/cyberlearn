"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRequestUser } from "@/lib/auth";
import { ratePathForUser, type RatePathResult } from "@/lib/paths/rate-path";

const ratingSchema = z.object({
  pathId: z.string().uuid(),
  score: z.number().int().min(1).max(5),
  feedback: z.string().max(500).optional(),
});

/** Web entry point: authenticates the session, then records the rating. */
export async function ratePathAction(
  pathId: string,
  score: number,
  feedback?: string,
): Promise<RatePathResult> {
  const parsed = ratingSchema.safeParse({ pathId, score, feedback });
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const user = await requireRequestUser();
  const result = await ratePathForUser(
    user.id,
    parsed.data.pathId,
    parsed.data.score,
    parsed.data.feedback,
  );
  if (result.ok) revalidatePath("/paths");
  return result;
}
