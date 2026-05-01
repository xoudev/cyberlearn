"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma, type BadgeRarity, type BadgeCriterionType } from "@cyberlearn/db";
import { requireAdminAction } from "@/lib/auth";

// Per-criterionType structural validation for criterionData
const criterionDataSchemas: Record<string, z.ZodTypeAny> = {
  LESSON_COMPLETED: z.object({ lessonId: z.string().uuid().optional() }),
  PATH_COMPLETED: z.object({ pathId: z.string().uuid().optional() }),
  XP_THRESHOLD: z.object({ threshold: z.number().positive() }),
  STREAK_DAYS: z.object({ days: z.number().int().positive() }),
  LESSON_COUNT: z.object({ count: z.number().int().positive() }),
  PERFECT_QUIZ: z.object({ quizId: z.string().optional() }),
  FIRST_LOGIN: z.object({}),
  MANUAL: z.object({}),
};

const createBadgeSchema = z.object({
  refCode: z.string().regex(/^CL-BDG-\d{3}$/, "Format: CL-BDG-001"),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(5).max(500),
  iconUrl: z.string().url("URL icône invalide"),
  rarity: z.enum(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]),
  criterionType: z.enum([
    "LESSON_COMPLETED",
    "PATH_COMPLETED",
    "XP_THRESHOLD",
    "STREAK_DAYS",
    "LESSON_COUNT",
    "PERFECT_QUIZ",
    "FIRST_LOGIN",
    "MANUAL",
  ]),
  criterionData: z.string().trim().min(2),
  xpReward: z.coerce.number().int().nonnegative().max(10000),
});

export interface CreateBadgeState {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

export async function createBadgeAction(
  _prev: CreateBadgeState,
  formData: FormData,
): Promise<CreateBadgeState> {
  const admin = await requireAdminAction();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createBadgeSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: CreateBadgeState["fieldErrors"] = {};
    for (const [field, errs] of Object.entries(parsed.error.flatten().fieldErrors)) {
      if (errs[0]) fieldErrors[field] = errs[0];
    }
    return { error: "Formulaire invalide.", fieldErrors };
  }

  // Validate criterionData structure against the selected criterionType
  let parsedCriterionData: unknown;
  try {
    // SAFETY: JSON.parse returns any; validated by the per-type schema below
    parsedCriterionData = JSON.parse(parsed.data.criterionData) as unknown;
  } catch {
    return {
      error: "criterionData : JSON invalide.",
      fieldErrors: { criterionData: "JSON invalide" },
    };
  }

  const typeSchema = criterionDataSchemas[parsed.data.criterionType];
  if (typeSchema) {
    const dataCheck = typeSchema.safeParse(parsedCriterionData);
    if (!dataCheck.success) {
      return {
        error: "Données du critère invalides pour ce type.",
        fieldErrors: { criterionData: dataCheck.error.issues[0]?.message },
      };
    }
    parsedCriterionData = dataCheck.data;
  }

  try {
    const badge = await prisma.badge.create({
      data: {
        refCode: parsed.data.refCode,
        name: parsed.data.name,
        description: parsed.data.description,
        iconUrl: parsed.data.iconUrl,
        // SAFETY: Zod enum values are identical to Prisma enum values
        rarity: parsed.data.rarity as BadgeRarity,
        criterionType: parsed.data.criterionType as BadgeCriterionType,
        // SAFETY: validated by per-type Zod schema above
        criterionData: parsedCriterionData as Parameters<
          typeof prisma.badge.create
        >[0]["data"]["criterionData"],
        xpReward: parsed.data.xpReward,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "badge.create",
        targetType: "Badge",
        targetId: badge.id,
        metadata: { name: badge.name, rarity: badge.rarity },
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique constraint")) {
      return { error: "Ce refCode ou ce nom existe déjà." };
    }
    return { error: "Erreur lors de la création." };
  }

  redirect("/badges");
}
