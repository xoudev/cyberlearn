import type { CosmeticType } from "@prisma/client";
import { prisma } from "../prisma.js";

/** A catalog cosmetic joined with the requesting user's unlocked + equipped state. */
export interface CosmeticWithState {
  id: string;
  code: string;
  type: CosmeticType;
  label: string;
  description: string | null;
  rarity: string;
  criterionType: string;
  criterionData: unknown;
  orderIndex: number;
  unlocked: boolean;
  equipped: boolean;
}

/** The equipped Cosmetic.code per slot (null = platform default). */
export interface EquippedCodes {
  terminalTheme: string | null;
  hexagonStyle: string | null;
  profileFrame: string | null;
  accentColor: string | null;
}

export const cosmeticRepository = {
  /** All active cosmetics (catalog), grouped by type then order. */
  listActive() {
    return prisma.cosmetic.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { orderIndex: "asc" }],
    });
  },

  /** Cosmetic ids the user has unlocked. */
  async findUnlockedIds(userId: string): Promise<ReadonlySet<string>> {
    const rows = await prisma.userCosmetic.findMany({
      where: { userId },
      select: { cosmeticId: true },
    });
    return new Set(rows.map((r) => r.cosmeticId));
  },

  /** The user's equipped loadout (codes per slot); all null when none set. */
  async findLoadout(userId: string): Promise<EquippedCodes> {
    const row = await prisma.userCosmeticLoadout.findUnique({ where: { userId } });
    return {
      terminalTheme: row?.terminalTheme ?? null,
      hexagonStyle: row?.hexagonStyle ?? null,
      profileFrame: row?.profileFrame ?? null,
      accentColor: row?.accentColor ?? null,
    };
  },

  /** Catalog + the user's unlocked/equipped state, for the casier page. */
  async findCatalogWithState(userId: string): Promise<CosmeticWithState[]> {
    const [catalog, unlockedRows, loadout] = await Promise.all([
      prisma.cosmetic.findMany({
        where: { isActive: true },
        orderBy: [{ type: "asc" }, { orderIndex: "asc" }],
      }),
      prisma.userCosmetic.findMany({ where: { userId }, select: { cosmeticId: true } }),
      prisma.userCosmeticLoadout.findUnique({ where: { userId } }),
    ]);
    const unlocked = new Set(unlockedRows.map((r) => r.cosmeticId));
    const equippedByType: Record<CosmeticType, string | null> = {
      TERMINAL_THEME: loadout?.terminalTheme ?? null,
      HEXAGON_STYLE: loadout?.hexagonStyle ?? null,
      PROFILE_FRAME: loadout?.profileFrame ?? null,
      ACCENT_COLOR: loadout?.accentColor ?? null,
    };
    return catalog.map((c) => ({
      id: c.id,
      code: c.code,
      type: c.type,
      label: c.label,
      description: c.description,
      rarity: c.rarity,
      criterionType: c.criterionType,
      criterionData: c.criterionData,
      orderIndex: c.orderIndex,
      unlocked: unlocked.has(c.id),
      equipped: equippedByType[c.type] === c.code,
    }));
  },

  /** Look up a cosmetic by its stable code (used by the equip action). */
  findByCode(code: string) {
    return prisma.cosmetic.findUnique({ where: { code } });
  },

  /** True when the user owns (has unlocked) the cosmetic. */
  async hasUnlocked(userId: string, cosmeticId: string): Promise<boolean> {
    const row = await prisma.userCosmetic.findUnique({
      where: { userId_cosmeticId: { userId, cosmeticId } },
      select: { id: true },
    });
    return row !== null;
  },
};
