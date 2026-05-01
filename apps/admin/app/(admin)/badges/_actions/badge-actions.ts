"use server";

import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { z } from "zod";
import { prisma, type BadgeRarity, type BadgeCriterionType } from "@cyberlearn/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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

  criterionData: z
    .string()
    .trim()
    .min(2)
    .transform((v) => {
      // SAFETY: JSON.parse returns any; Prisma JsonValue accepts it
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return JSON.parse(v);
      } catch {
        return {};
      }
    }),
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
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const jwtRole = user.app_metadata.user_role as string | undefined;
  let role = jwtRole;
  if (!role) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
    role = dbUser?.role ?? undefined;
  }
  if (role !== "ADMIN") notFound();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createBadgeSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: CreateBadgeState["fieldErrors"] = {};
    for (const [field, errs] of Object.entries(parsed.error.flatten().fieldErrors)) {
      if (errs[0]) fieldErrors[field] = errs[0];
    }
    return { error: "Formulaire invalide.", fieldErrors };
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        criterionData: parsed.data.criterionData,
        xpReward: parsed.data.xpReward,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
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
