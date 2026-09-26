"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRequestUser } from "@/lib/auth";
import { equipCosmeticForUser } from "@/lib/cosmetics/equip";

export interface CosmeticActionResult {
  ok: boolean;
  error?: string;
}

/** Equip a cosmetic by code. Validates server-side that the user OWNS it. */
export async function equipCosmeticAction(code: string): Promise<CosmeticActionResult> {
  const authUser = await requireRequestUser();
  const parsed = z.string().trim().min(1).max(40).safeParse(code);
  if (!parsed.success) return { ok: false, error: "Cosmétique invalide." };

  const result = await equipCosmeticForUser(authUser.id, parsed.data);
  if (result.ok) {
    revalidatePath("/locker");
    revalidatePath("/profile");
  }
  return result;
}
