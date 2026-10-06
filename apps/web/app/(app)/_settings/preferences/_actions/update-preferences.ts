"use server";

import { prisma } from "@cyberlearn/db";
import { themeSchema } from "@cyberlearn/types";
import { requireRequestUser } from "@/lib/auth";

export interface UpdateThemeState {
  success?: boolean;
  error?: string;
}

/**
 * Persists the user's theme preference. The visible theme switch is applied
 * client-side immediately via next-themes; this action only stores the choice.
 * Locale is intentionally not handled yet (i18n is not wired).
 */
export async function updateThemeAction(
  _prev: UpdateThemeState,
  formData: FormData,
): Promise<UpdateThemeState> {
  const authUser = await requireRequestUser();

  const parsed = themeSchema.safeParse(formData.get("theme"));
  if (!parsed.success) {
    return { error: "Thème invalide." };
  }

  await prisma.userPreferences.upsert({
    where: { userId: authUser.id },
    create: { userId: authUser.id, theme: parsed.data },
    update: { theme: parsed.data },
  });

  return { success: true };
}
