import { cosmeticRepository, prisma } from "@cyberlearn/db";
import type { CosmeticType } from "@cyberlearn/db";
import { loadoutPatchFor } from "@/lib/cosmetics/slots";

export interface EquipResult {
  ok: boolean;
  error?: string;
}

export const COSMETIC_TYPES: readonly CosmeticType[] = [
  "TERMINAL_THEME",
  "HEXAGON_STYLE",
  "PROFILE_FRAME",
  "ACCENT_COLOR",
];

/**
 * Equip a cosmetic by code with a server-side OWNERSHIP check. Callers are
 * responsible for authentication (web session or mobile Bearer JWT); lives
 * outside "use server" so it can never be invoked with an arbitrary userId.
 */
export async function equipCosmeticForUser(userId: string, code: string): Promise<EquipResult> {
  const cosmetic = await cosmeticRepository.findByCode(code);
  if (!cosmetic?.isActive) return { ok: false, error: "Cosmétique introuvable." };

  const owned = await cosmeticRepository.hasUnlocked(userId, cosmetic.id);
  if (!owned) return { ok: false, error: "Cosmétique non débloqué." };

  const patch = loadoutPatchFor(cosmetic.type, cosmetic.code);
  await prisma.userCosmeticLoadout.upsert({
    where: { userId },
    create: { userId, ...patch },
    update: patch,
  });
  return { ok: true };
}

/** Clear the equipped cosmetic for a slot (revert to the platform default). */
export async function unequipCosmeticForUser(
  userId: string,
  type: CosmeticType,
): Promise<EquipResult> {
  if (!COSMETIC_TYPES.includes(type)) return { ok: false, error: "Type invalide." };
  const patch = loadoutPatchFor(type, null);
  await prisma.userCosmeticLoadout.upsert({
    where: { userId },
    create: { userId, ...patch },
    update: patch,
  });
  return { ok: true };
}
