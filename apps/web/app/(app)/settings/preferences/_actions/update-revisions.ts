"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";

export interface UpdateRevisionsState {
  success?: boolean;
  error?: string;
}

/**
 * Turns spaced repetition on or off for this account.
 *
 * Existing schedules are deliberately left in place. Turning the feature back
 * on should resume the queue where it stopped, and a switch that silently
 * destroys months of scheduling is a switch nobody dares touch. What stops is
 * the feeding, the surfaces and the reminders.
 *
 * Several server-rendered surfaces read this preference - the sidebar, the
 * dashboard, the revisions page - so they are all revalidated rather than left
 * to expire. A switch whose effect shows up on the next hard refresh reads as
 * broken.
 */
export async function updateRevisionsAction(
  _prev: UpdateRevisionsState,
  formData: FormData,
): Promise<UpdateRevisionsState> {
  const authUser = await requireRequestUser();

  const parsed = z.enum(["true", "false"]).safeParse(formData.get("spacedRepetition"));
  if (!parsed.success) return { error: "Valeur invalide." };

  const spacedRepetition = parsed.data === "true";

  await prisma.userPreferences.upsert({
    where: { userId: authUser.id },
    create: { userId: authUser.id, spacedRepetition },
    update: { spacedRepetition },
  });

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/revisions");

  return { success: true };
}
