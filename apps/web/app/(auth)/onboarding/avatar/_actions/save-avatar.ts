"use server";

import { prisma } from "@cyberlearn/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";
import { redirect } from "next/navigation";

const BUILTIN_AVATAR_PATHS = [
  "/avatars/av-1.svg",
  "/avatars/av-2.svg",
  "/avatars/av-3.svg",
  "/avatars/av-4.svg",
  "/avatars/av-5.svg",
  "/avatars/av-6.svg",
  "/avatars/av-7.svg",
  "/avatars/av-8.svg",
] as const;

const saveAvatarSchema = z.object({
  avatarUrl: z.enum(BUILTIN_AVATAR_PATHS),
});

export interface SaveAvatarState {
  error?: string;
}

export async function saveAvatar(
  _prev: SaveAvatarState,
  formData: FormData,
): Promise<SaveAvatarState> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const raw = formData.get("avatarUrl") ?? "/avatars/av-8.svg";

  const parsed = saveAvatarSchema.safeParse({ avatarUrl: raw });
  if (!parsed.success) {
    return { error: "Avatar invalide." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: parsed.data.avatarUrl },
  });

  redirect("/onboarding/placement-test");
}
