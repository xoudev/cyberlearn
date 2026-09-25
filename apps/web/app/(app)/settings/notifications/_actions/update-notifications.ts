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

function optionalBoolean(value: FormDataEntryValue | null): unknown {
  if (value === null) return undefined;
  return readBoolean(value) ?? value;
}

/**
 * Updates the wired email-notification toggles (review reminders, the
 * moderation and class-work notices, product news). streakReminder is
 * intentionally not accepted here - its delivery is not built yet, so the UI
 * keeps it disabled.
 */
export async function updateNotificationsAction(
  _prev: UpdateNotificationsState,
  formData: FormData,
): Promise<UpdateNotificationsState> {
  const authUser = await requireRequestUser();

  const parsed = updateNotificationsSchema.safeParse({
    reviewReminders: readBoolean(formData.get("reviewReminders")),
    weeklyDigest: readBoolean(formData.get("weeklyDigest")),
    // Absent from an older form: left as it is. Present, it has to be a
    // boolean like the others, so a malformed value reaches Zod as itself.
    emailNotifications: optionalBoolean(formData.get("emailNotifications")),
  });
  if (!parsed.success) {
    return { error: "Préférences de notification invalides." };
  }

  const { reviewReminders, weeklyDigest, emailNotifications } = parsed.data;
  const values = {
    reviewReminders,
    weeklyDigest,
    ...(emailNotifications !== undefined ? { emailNotifications } : {}),
  };

  await prisma.userPreferences.upsert({
    where: { userId: authUser.id },
    create: { userId: authUser.id, ...values },
    update: values,
  });

  revalidatePath("/settings/notifications");
  return { success: true };
}
