"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma, type BadgeRarity, type BadgeCriterionType } from "@cyberlearn/db";
import { requireAdminAction } from "@/lib/auth";

// ── Per-type criterion data builders ──────────────────────────────────────────

function buildCriterionData(
  criterionType: string,
  formData: FormData,
): { data: unknown; error?: string } {
  switch (criterionType) {
    case "LESSON_COMPLETED": {
      const count = z.coerce.number().int().min(1).safeParse(formData.get("criterion_count"));
      if (!count.success) return { data: null, error: "Nombre de leçons requis (entier ≥ 1)" };
      return { data: { count: count.data } };
    }
    case "PATH_COMPLETED": {
      const withCert = formData.get("criterion_withCertificate") === "1";
      if (withCert) return { data: { withCertificate: true } };
      const count = z.coerce.number().int().min(1).safeParse(formData.get("criterion_count"));
      if (!count.success) return { data: null, error: "Nombre de parcours requis (entier ≥ 1)" };
      return { data: { count: count.data } };
    }
    case "XP_THRESHOLD": {
      const threshold = z.coerce
        .number()
        .int()
        .min(1)
        .safeParse(formData.get("criterion_threshold"));
      if (!threshold.success) return { data: null, error: "Seuil XP requis (entier ≥ 1)" };
      return { data: { threshold: threshold.data } };
    }
    case "STREAK_DAYS": {
      const days = z.coerce.number().int().min(1).safeParse(formData.get("criterion_days"));
      if (!days.success) return { data: null, error: "Nombre de jours requis (entier ≥ 1)" };
      return { data: { days: days.data } };
    }
    case "CATEGORY_MASTERY": {
      const category = z.string().min(1).safeParse(formData.get("criterion_category"));
      const count = z.coerce.number().int().min(1).safeParse(formData.get("criterion_count"));
      if (!category.success) return { data: null, error: "Catégorie requise" };
      if (!count.success) return { data: null, error: "Nombre de leçons requis (entier ≥ 1)" };
      return { data: { category: category.data, count: count.data } };
    }
    case "LESSON_SPECIFIC": {
      const lessonId = z
        .string()
        .uuid("ID de leçon invalide")
        .safeParse(formData.get("criterion_lessonId"));
      if (!lessonId.success)
        return { data: null, error: lessonId.error.issues[0]?.message ?? "Leçon requise" };
      return { data: { lessonId: lessonId.data } };
    }
    case "PERFECT_QUIZ": {
      const count = z.coerce.number().int().min(1).safeParse(formData.get("criterion_count"));
      if (!count.success)
        return { data: null, error: "Nombre de quiz parfaits requis (entier ≥ 1)" };
      return { data: { count: count.data } };
    }
    case "CUSTOM": {
      const event = z.string().trim().min(1).max(100).safeParse(formData.get("criterion_event"));
      if (!event.success) return { data: null, error: "Événement requis" };
      return { data: { event: event.data } };
    }
    default:
      return { data: null, error: "Type de critère inconnu" };
  }
}

// ── Shared schemas ─────────────────────────────────────────────────────────────

// NOTE: must NOT be exported. This file has "use server", so Next.js only allows
// async-function exports (next-flight-loader/action-validate). Exporting this
// array throws at runtime: 'A "use server" file can only export async functions'.
const VALID_CRITERION_TYPES = [
  "LESSON_COMPLETED",
  "PATH_COMPLETED",
  "XP_THRESHOLD",
  "STREAK_DAYS",
  "CATEGORY_MASTERY",
  "LESSON_SPECIFIC",
  "PERFECT_QUIZ",
  "CUSTOM",
] as const;

const badgeBaseSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(5).max(500),
  iconUrl: z.string().url("URL icône invalide"),
  rarity: z.enum(["COMMON", "RARE", "EPIC", "LEGENDARY"]),
  criterionType: z.enum(VALID_CRITERION_TYPES),
  xpReward: z.coerce.number().int().nonnegative().max(10000),
});

const createBadgeSchema = badgeBaseSchema.extend({
  refCode: z.string().regex(/^CL-BDG-\d{3}$/, "Format: CL-BDG-001"),
});

export interface BadgeFormState {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

// ── Create ─────────────────────────────────────────────────────────────────────

export async function createBadgeAction(
  _prev: BadgeFormState,
  formData: FormData,
): Promise<BadgeFormState> {
  const admin = await requireAdminAction();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createBadgeSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: BadgeFormState["fieldErrors"] = {};
    for (const [field, errs] of Object.entries(parsed.error.flatten().fieldErrors)) {
      if (errs[0]) fieldErrors[field] = errs[0];
    }
    return { error: "Formulaire invalide.", fieldErrors };
  }

  const { data: criterionData, error: criterionError } = buildCriterionData(
    parsed.data.criterionType,
    formData,
  );

  if (criterionError ?? criterionData === null) {
    return {
      error: criterionError ?? "Données du critère invalides.",
      fieldErrors: { criterion: criterionError },
    };
  }

  try {
    const badge = await prisma.badge.create({
      data: {
        refCode: parsed.data.refCode,
        name: parsed.data.name,
        description: parsed.data.description,
        iconUrl: parsed.data.iconUrl,
        // SAFETY: Zod enum values match Prisma enum values exactly
        rarity: parsed.data.rarity as BadgeRarity,
        criterionType: parsed.data.criterionType as BadgeCriterionType,
        // SAFETY: validated by per-type builder above
        criterionData: criterionData as Parameters<
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

// ── Update ─────────────────────────────────────────────────────────────────────

export async function updateBadgeAction(
  _prev: BadgeFormState,
  formData: FormData,
): Promise<BadgeFormState> {
  const admin = await requireAdminAction();

  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "ID invalide." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = badgeBaseSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: BadgeFormState["fieldErrors"] = {};
    for (const [field, errs] of Object.entries(parsed.error.flatten().fieldErrors)) {
      if (errs[0]) fieldErrors[field] = errs[0];
    }
    return { error: "Formulaire invalide.", fieldErrors };
  }

  const { data: criterionData, error: criterionError } = buildCriterionData(
    parsed.data.criterionType,
    formData,
  );

  if (criterionError ?? criterionData === null) {
    return {
      error: criterionError ?? "Données du critère invalides.",
      fieldErrors: { criterion: criterionError },
    };
  }

  try {
    await prisma.badge.update({
      where: { id: id.data },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        iconUrl: parsed.data.iconUrl,
        // SAFETY: Zod enum values match Prisma enum values exactly
        rarity: parsed.data.rarity as BadgeRarity,
        criterionType: parsed.data.criterionType as BadgeCriterionType,
        // SAFETY: validated by per-type builder above; NonNullable strips the optional undefined
        criterionData: criterionData as NonNullable<
          Parameters<typeof prisma.badge.update>[0]["data"]["criterionData"]
        >,
        xpReward: parsed.data.xpReward,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "badge.update",
        targetType: "Badge",
        targetId: id.data,
        metadata: { name: parsed.data.name },
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique constraint")) return { error: "Ce nom existe déjà." };
    return { error: "Erreur lors de la mise à jour." };
  }

  redirect("/badges");
}

// ── Toggle active ──────────────────────────────────────────────────────────────

export async function toggleBadgeActiveAction(formData: FormData): Promise<void> {
  await requireAdminAction();

  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const badge = await prisma.badge.findUnique({
    where: { id: id.data },
    select: { isActive: true },
  });
  if (!badge) return;

  await prisma.badge.update({ where: { id: id.data }, data: { isActive: !badge.isActive } });
  revalidatePath("/badges");
}

// ── Delete ─────────────────────────────────────────────────────────────────────

export async function deleteBadgeAction(formData: FormData): Promise<void> {
  const admin = await requireAdminAction();

  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const badge = await prisma.badge.findUnique({
    where: { id: id.data },
    select: { name: true, _count: { select: { userBadges: true } } },
  });
  if (!badge) return;

  // Refuse deletion if users have already earned it — deactivate instead
  if (badge._count.userBadges > 0) return;

  await prisma.badge.delete({ where: { id: id.data } });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "badge.delete",
      targetType: "Badge",
      targetId: id.data,
      metadata: { name: badge.name },
    },
  });

  revalidatePath("/badges");
}

// Re-export type alias for backward compat
export type { BadgeFormState as CreateBadgeState };
