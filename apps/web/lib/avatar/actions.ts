"use server";

import { prisma } from "@cyberlearn/db";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { uploadUserAvatar } from "@/lib/avatar/storage";

export interface UploadAvatarState {
  ok?: boolean;
  error?: string;
  /** The stored marker, so the client can preview without a round-trip. */
  avatarUrl?: string;
}

/**
 * Validates and stores a user-uploaded avatar, then points User.avatarUrl at it.
 * Shared by onboarding and settings. Does not redirect: callers decide what to
 * do on success (onboarding advances, settings stays and revalidates).
 */
export async function uploadAvatarAction(
  _prev: UploadAvatarState,
  formData: FormData,
): Promise<UploadAvatarState> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée. Reconnecte-toi." };

  const file = formData.get("avatar");
  if (!(file instanceof File)) return { error: "Aucun fichier reçu." };

  const current = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatarUrl: true },
  });

  const result = await uploadUserAvatar(user.id, file, current?.avatarUrl ?? null);
  if (result.error || !result.marker) {
    return { error: result.error ?? "Échec de l'envoi." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: result.marker },
  });

  // Refresh the surfaces that show the avatar (the navbar lives in the app layout).
  revalidatePath("/settings/profile");
  revalidatePath("/profile");
  revalidatePath("/", "layout");

  return { ok: true, avatarUrl: result.marker };
}
