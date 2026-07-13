"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CosmeticType } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { equipCosmeticForUser, unequipCosmeticForUser } from "@/lib/cosmetics/equip";

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
    revalidatePath("/casier");
    revalidatePath("/profile");
  }
  return result;
}

/** Clear the equipped cosmetic for a slot (revert to the platform default). */
export async function unequipCosmeticAction(type: CosmeticType): Promise<CosmeticActionResult> {
  const authUser = await requireRequestUser();
  const result = await unequipCosmeticForUser(authUser.id, type);
  if (result.ok) {
    revalidatePath("/casier");
    revalidatePath("/profile");
  }
  return result;
}
