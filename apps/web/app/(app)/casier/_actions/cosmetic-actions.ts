"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { cosmeticRepository, prisma } from "@cyberlearn/db";
import type { CosmeticType } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { loadoutPatchFor } from "@/lib/cosmetics/slots";

export interface CosmeticActionResult {
  ok: boolean;
  error?: string;
}

const COSMETIC_TYPES: readonly CosmeticType[] = [
  "TERMINAL_THEME",
  "HEXAGON_STYLE",
  "PROFILE_FRAME",
  "ACCENT_COLOR",
];

/** Equip a cosmetic by code. Validates server-side that the user OWNS it. */
export async function equipCosmeticAction(code: string): Promise<CosmeticActionResult> {
  const authUser = await requireRequestUser();
  const parsed = z.string().trim().min(1).max(40).safeParse(code);
  if (!parsed.success) return { ok: false, error: "Cosmétique invalide." };

  const cosmetic = await cosmeticRepository.findByCode(parsed.data);
  if (!cosmetic?.isActive) return { ok: false, error: "Cosmétique introuvable." };

  // SERVER-side ownership check: never equip a cosmetic the user has not unlocked.
  const owned = await cosmeticRepository.hasUnlocked(authUser.id, cosmetic.id);
  if (!owned) return { ok: false, error: "Cosmétique non débloqué." };

  const patch = loadoutPatchFor(cosmetic.type, cosmetic.code);
  await prisma.userCosmeticLoadout.upsert({
    where: { userId: authUser.id },
    create: { userId: authUser.id, ...patch },
    update: patch,
  });

  revalidatePath("/casier");
  revalidatePath("/profile");
  return { ok: true };
}

/** Clear the equipped cosmetic for a slot (revert to the platform default). */
export async function unequipCosmeticAction(type: CosmeticType): Promise<CosmeticActionResult> {
  const authUser = await requireRequestUser();
  if (!COSMETIC_TYPES.includes(type)) return { ok: false, error: "Type invalide." };

  const patch = loadoutPatchFor(type, null);
  await prisma.userCosmeticLoadout.upsert({
    where: { userId: authUser.id },
    create: { userId: authUser.id, ...patch },
    update: patch,
  });

  revalidatePath("/casier");
  revalidatePath("/profile");
  return { ok: true };
}
