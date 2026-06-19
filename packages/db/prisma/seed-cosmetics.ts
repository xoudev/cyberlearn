/**
 * Seeds the cosmetic catalog from packages/db/prisma/cosmetics.json.
 *
 *   pnpm --filter @cyberlearn/db db:seed-cosmetics          (DRY RUN: validate only)
 *   pnpm --filter @cyberlearn/db db:seed-cosmetics --apply  (write to the database)
 *
 * Idempotent: upserts each cosmetic by its stable `code`. The visual definition
 * of each cosmetic (CSS) lives in the design system keyed by that same code;
 * this catalog only carries metadata + the unlock condition (reusing the badge
 * criterion shape). Validation always runs first; --apply refuses on any error.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type BadgeCriterionType,
  type BadgeRarity,
  type CosmeticType,
  PrismaClient,
  type Prisma,
} from "@prisma/client";

const apply = process.argv.includes("--apply");

const TYPES = ["TERMINAL_THEME", "HEXAGON_STYLE", "PROFILE_FRAME", "ACCENT_COLOR"];
const RARITIES = ["COMMON", "RARE", "EPIC", "LEGENDARY"];
const CRITERION_TYPES = [
  "LESSON_COMPLETED",
  "PATH_COMPLETED",
  "XP_THRESHOLD",
  "STREAK_DAYS",
  "CATEGORY_MASTERY",
  "PERFECT_QUIZ",
  "CUSTOM",
  "LESSON_SPECIFIC",
  "LEVEL",
  "BADGE_EARNED",
];

interface CosmeticEntry {
  code: string;
  type: string;
  label: string;
  description?: string;
  rarity: string;
  criterionType: string;
  criterionData: Record<string, unknown>;
  orderIndex: number;
}

function findCosmeticsFile(): string {
  // Works whether launched from the package dir (pnpm --filter) or the repo root.
  const candidates = [
    join(process.cwd(), "prisma", "cosmetics.json"),
    join(process.cwd(), "packages", "db", "prisma", "cosmetics.json"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error("packages/db/prisma/cosmetics.json introuvable.");
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validate(raw: unknown): { errors: string[]; data: CosmeticEntry[] } {
  const errors: string[] = [];
  if (!Array.isArray(raw)) return { errors: ["le fichier doit être un tableau JSON"], data: [] };

  const codes = new Set<string>();
  const data: CosmeticEntry[] = [];
  raw.forEach((entry, i) => {
    const at = `#${String(i + 1)}`;
    if (!isObject(entry)) {
      errors.push(`${at}: n'est pas un objet`);
      return;
    }
    const { code, type, label, description, rarity, criterionType, criterionData, orderIndex } =
      entry;
    if (typeof code !== "string" || code.trim().length < 1 || code.length > 40) {
      errors.push(`${at}: 'code' invalide (1-40 caractères)`);
    } else if (codes.has(code)) {
      errors.push(`${at}: 'code' en double (${code})`);
    } else {
      codes.add(code);
    }
    if (typeof type !== "string" || !TYPES.includes(type)) errors.push(`${at}: 'type' invalide`);
    if (typeof label !== "string" || label.trim().length < 1 || label.length > 80) {
      errors.push(`${at}: 'label' invalide (1-80 caractères)`);
    }
    if (
      description !== undefined &&
      (typeof description !== "string" || description.length > 280)
    ) {
      errors.push(`${at}: 'description' invalide (max 280 caractères)`);
    }
    if (typeof rarity !== "string" || !RARITIES.includes(rarity)) {
      errors.push(`${at}: 'rarity' invalide`);
    }
    if (typeof criterionType !== "string" || !CRITERION_TYPES.includes(criterionType)) {
      errors.push(`${at}: 'criterionType' invalide`);
    }
    if (!isObject(criterionData)) errors.push(`${at}: 'criterionData' doit être un objet`);
    if (typeof orderIndex !== "number" || !Number.isInteger(orderIndex) || orderIndex < 0) {
      errors.push(`${at}: 'orderIndex' doit être un entier >= 0`);
    }
    const blob = `${String(code)} ${String(label)} ${String(description ?? "")}`;
    if (blob.includes("—")) errors.push(`${at}: contient un tiret cadratin "—" (interdit)`);

    if (
      typeof code === "string" &&
      typeof type === "string" &&
      typeof label === "string" &&
      typeof rarity === "string" &&
      typeof criterionType === "string" &&
      isObject(criterionData) &&
      typeof orderIndex === "number"
    ) {
      data.push({
        code,
        type,
        label,
        rarity,
        criterionType,
        criterionData,
        orderIndex,
        ...(typeof description === "string" ? { description } : {}),
      });
    }
  });
  return { errors, data };
}

async function main(): Promise<void> {
  const file = findCosmeticsFile();
  const { errors, data } = validate(JSON.parse(readFileSync(file, "utf8")));

  console.log(
    apply ? "== APPLY MODE ==" : "== DRY RUN (validation seule, passez --apply pour écrire) ==",
  );
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.log(`\n${String(data.length)} cosmétiques valides. Erreurs: ${String(errors.length)}.`);
  if (errors.length > 0) {
    console.error("Validation échouée: corrige content/cosmetics.json avant --apply.");
    process.exitCode = 1;
    return;
  }
  if (!apply) {
    console.log("Validation OK (dry run). Relance avec --apply pour écrire en base.");
    return;
  }

  const prisma = new PrismaClient();
  try {
    for (const c of data) {
      // SAFETY: type/rarity/criterionType validated against the allowed sets above.
      const fields = {
        type: c.type as CosmeticType,
        label: c.label,
        description: c.description ?? null,
        rarity: c.rarity as BadgeRarity,
        criterionType: c.criterionType as BadgeCriterionType,
        criterionData: c.criterionData as Prisma.InputJsonValue,
        orderIndex: c.orderIndex,
        isActive: true,
      };
      await prisma.cosmetic.upsert({
        where: { code: c.code },
        create: { code: c.code, ...fields },
        update: fields,
      });
    }
    console.log(`\n${String(data.length)} cosmétiques écrits en base.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
