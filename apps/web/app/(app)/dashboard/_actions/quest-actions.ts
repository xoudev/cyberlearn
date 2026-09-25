"use server";

import { revalidatePath } from "next/cache";
import { requireRequestUser } from "@/lib/auth";
import { claimQuestFor, type ClaimQuestResult } from "@/lib/quests/claim";

export type { ClaimQuestResult } from "@/lib/quests/claim";

/**
 * The site's end of claiming a weekly quest: the session, then the service
 * the app uses too (@/lib/quests/claim), then the pages that show XP refreshed.
 */
export async function claimQuestAction(questId: string): Promise<ClaimQuestResult> {
  const authUser = await requireRequestUser();
  const result = await claimQuestFor(authUser.id, questId);
  if (result.ok) {
    revalidatePath("/dashboard");
    revalidatePath("/profile");
  }
  return result;
}
