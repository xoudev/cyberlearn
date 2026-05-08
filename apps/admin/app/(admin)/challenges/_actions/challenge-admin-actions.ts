"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import { requireAdminAction } from "@/lib/auth";

// ── Shared form state ──────────────────────────────────────────────────────────

export interface ChallengeFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

// ── Zod schema ────────────────────────────────────────────────────────────────

const challengeSchema = z.object({
  refCode: z.string().trim().min(1).max(50),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug : lettres minuscules, chiffres et tirets uniquement"),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(1000),
  instructions: z.string().trim().min(1),
  category: z.enum(["CYBERSEC", "DEV", "NETWORK"]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  type: z.enum(["CTF", "PUZZLE", "LAB", "SCRIPT"]),
  xpReward: z.coerce.number().int().min(1).max(10000),
  timeLimitMin: z.coerce.number().int().min(0).max(600).default(0),
  maxAttempts: z.coerce.number().int().min(1).max(100).default(3),
  flag: z.string().trim().max(500).optional(),
  starterCode: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  orderIndex: z.coerce.number().int().min(0).default(0),
  prerequisiteId: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().uuid().optional(),
  ),
  attachmentUrl: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().trim().max(500).optional(),
  ),
  resourceUrl: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().trim().max(1000).optional(),
  ),
});

function parseFormData(formData: FormData): ReturnType<typeof challengeSchema.safeParse> {
  return challengeSchema.safeParse({
    refCode: formData.get("refCode"),
    slug: formData.get("slug"),
    title: formData.get("title"),
    description: formData.get("description"),
    instructions: formData.get("instructions"),
    category: formData.get("category"),
    difficulty: formData.get("difficulty"),
    type: formData.get("type"),
    xpReward: formData.get("xpReward"),
    timeLimitMin: formData.get("timeLimitMin"),
    maxAttempts: formData.get("maxAttempts"),
    flag: formData.get("flag"),
    starterCode: formData.get("starterCode"),
    orderIndex: formData.get("orderIndex"),
    prerequisiteId: formData.get("prerequisiteId"),
    attachmentUrl: formData.get("attachmentUrl"),
    resourceUrl: formData.get("resourceUrl"),
  });
}

// ── Create ─────────────────────────────────────────────────────────────────────

export async function createChallengeAction(
  _prev: ChallengeFormState,
  formData: FormData,
): Promise<ChallengeFormState> {
  await requireAdminAction();
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const { prerequisiteId, flag, starterCode, attachmentUrl, resourceUrl, ...rest } = parsed.data;

  let createdId: string;
  try {
    const created = await prisma.challenge.create({
      data: {
        ...rest,
        ...(flag ? { flag } : {}),
        ...(prerequisiteId ? { prerequisiteId } : {}),
        starterCode: starterCode ?? null,
        attachmentUrl: attachmentUrl ?? null,
        resourceUrl: resourceUrl ?? null,
      },
      select: { id: true },
    });
    createdId = created.id;
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return { error: "Un challenge avec ce refCode ou ce slug existe déjà." };
    }
    return { error: "Erreur lors de la création du challenge." };
  }

  revalidatePath("/challenges");
  redirect(`/challenges/${createdId}/edit`);
}

// ── Update ─────────────────────────────────────────────────────────────────────

export async function updateChallengeAction(
  id: string,
  _prev: ChallengeFormState,
  formData: FormData,
): Promise<ChallengeFormState> {
  await requireAdminAction();
  if (!z.string().uuid().safeParse(id).success) return { error: "ID invalide." };

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const { prerequisiteId, flag, starterCode, attachmentUrl, resourceUrl, ...rest } = parsed.data;

  try {
    await prisma.challenge.update({
      where: { id },
      data: {
        ...rest,
        flag: flag ?? null,
        starterCode: starterCode ?? null,
        prerequisiteId: prerequisiteId ?? null,
        attachmentUrl: attachmentUrl ?? null,
        resourceUrl: resourceUrl ?? null,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return { error: "Un challenge avec ce refCode ou ce slug existe déjà." };
    }
    return { error: "Erreur lors de la mise à jour." };
  }

  revalidatePath("/challenges");
  return {};
}

// ── Toggle active ──────────────────────────────────────────────────────────────

export async function setChallengeActiveAction(
  id: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  await requireAdminAction();
  if (!z.string().uuid().safeParse(id).success) return { error: "ID invalide." };

  await prisma.challenge.update({ where: { id }, data: { isActive } });
  revalidatePath("/challenges");
  return {};
}

// ── Delete ─────────────────────────────────────────────────────────────────────

export async function deleteChallengeAction(id: string): Promise<{ error?: string }> {
  await requireAdminAction();
  if (!z.string().uuid().safeParse(id).success) return { error: "ID invalide." };

  const progress = await prisma.userChallengeProgress.count({ where: { challengeId: id } });
  if (progress > 0) {
    return {
      error: `Impossible de supprimer : ${String(progress)} progression(s) utilisateur liée(s).`,
    };
  }

  await prisma.challenge.delete({ where: { id } });
  revalidatePath("/challenges");
  redirect("/challenges");
}

// ── Hint CRUD ─────────────────────────────────────────────────────────────────

export async function createHintAction(
  challengeId: string,
  content: string,
  xpCost: number,
  orderIndex: number,
): Promise<{ error?: string }> {
  await requireAdminAction();
  if (!z.string().uuid().safeParse(challengeId).success) return { error: "ID invalide." };

  const validated = z
    .object({
      content: z.string().trim().min(1),
      xpCost: z.number().int().min(0).max(1000),
      orderIndex: z.number().int().min(0),
    })
    .safeParse({ content, xpCost, orderIndex });

  if (!validated.success) return { error: "Données invalides." };

  try {
    await prisma.challengeHint.create({
      data: { challengeId, ...validated.data },
    });
  } catch {
    return { error: "Erreur lors de la création de l'indice." };
  }

  revalidatePath(`/challenges/${challengeId}/edit`);
  return {};
}

export async function updateHintAction(
  hintId: string,
  content: string,
  xpCost: number,
): Promise<{ error?: string }> {
  await requireAdminAction();
  if (!z.string().uuid().safeParse(hintId).success) return { error: "ID invalide." };

  const validated = z
    .object({
      content: z.string().trim().min(1),
      xpCost: z.number().int().min(0).max(1000),
    })
    .safeParse({ content, xpCost });

  if (!validated.success) return { error: "Données invalides." };

  try {
    await prisma.challengeHint.update({
      where: { id: hintId },
      data: validated.data,
    });
  } catch {
    return { error: "Erreur lors de la mise à jour de l'indice." };
  }

  revalidatePath("/challenges");
  return {};
}

export async function deleteHintAction(hintId: string): Promise<{ error?: string }> {
  await requireAdminAction();
  if (!z.string().uuid().safeParse(hintId).success) return { error: "ID invalide." };

  try {
    await prisma.challengeHint.delete({ where: { id: hintId } });
  } catch {
    return { error: "Erreur lors de la suppression de l'indice." };
  }

  revalidatePath("/challenges");
  return {};
}
