"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@cyberlearn/db";
import { updateNotificationsSchema } from "@cyberlearn/types";
import { requireRequestUser } from "@/lib/auth";

export interface UpdateNotificationsState {
  success?: boolean;
  error?: string;
}

/** Strict "true"/"false" → boolean; anything else is undefined → Zod rejects it. */
function readBoolean(value: FormDataEntryValue | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

/**
 * Updates the wired email-notification toggles (review reminders + product
 * digest). streakReminder is intentionally not accepted here - its delivery is
 * not built yet, so the UI keeps it disabled.
 */
export async function updateNotificationsAction(
  _prev: UpdateNotificationsState,
  formData: FormData,
): Promise<UpdateNotificationsState> {
  const authUser = await requireRequestUser();

  const parsed = updateNotificationsSchema.safeParse({
    reviewReminders: readBoolean(formData.get("reviewReminders")),
    weeklyDigest: readBoolean(formData.get("weeklyDigest")),
  });
  if (!parsed.success) {
    return { error: "Préférences de notification invalides." };
  }

  const { reviewReminders, weeklyDigest } = parsed.data;

  await prisma.userPreferences.upsert({
    where: { userId: authUser.id },
    create: { userId: authUser.id, reviewReminders, weeklyDigest },
    update: { reviewReminders, weeklyDigest },
  });

  revalidatePath("/settings/notifications");
  return { success: true };
}
