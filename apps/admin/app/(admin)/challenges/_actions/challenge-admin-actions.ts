"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditLogRepository, prisma, JSON_NULL_IN_DB, tournamentRepository } from "@cyberlearn/db";
import { AUDIT_ACTION } from "@cyberlearn/db/audit-actions";
import { changedFields } from "@/lib/audit-diff";
import { requireAdminAction } from "@/lib/auth";
import { withSavedNotice } from "@/lib/saved-notice";
import { type ChallengeMachine, parseChallengeMachine } from "@cyberlearn/types";

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
  prerequisiteId: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.guid().optional()),
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

/**
 * The machine field of a CTF: empty is no machine; anything else must be JSON
 * the site can play (parseChallengeMachine), one file holding {{FLAG}}.
 */
function readMachine(
  formData: FormData,
): { ok: true; machine: ChallengeMachine | null } | { ok: false; error: string } {
  const raw = formData.get("machine");
  if (typeof raw !== "string" || raw.trim() === "") return { ok: true, machine: null };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Ce n'est pas du JSON valide." };
  }
  const parsed = parseChallengeMachine(value);
  return parsed.ok ? { ok: true, machine: parsed.machine } : { ok: false, error: parsed.problem };
}

/** The machine as the Json column stores it: no undefined in it. */
function machineJson(machine: ChallengeMachine): { title?: string; files: Record<string, string> } {
  return machine.title === undefined
    ? { files: machine.files }
    : { title: machine.title, files: machine.files };
}

// ── Audit ──────────────────────────────────────────────────────────────────────
//
// Every change made here is written to the audit log, in the same transaction
// as the change: none of them used to be, the flag included, while the sign-in
// screen and /audit both say every console action is logged. A row says who
// and what; for an edit, which fields moved, by name - the flag's value never
// goes in, see changedFields.

const TARGET = "Challenge";

/** The columns an edit can change, read before it to say which ones it did. */
const EDITABLE = {
  refCode: true,
  slug: true,
  title: true,
  description: true,
  instructions: true,
  category: true,
  difficulty: true,
  type: true,
  xpReward: true,
  timeLimitMin: true,
  maxAttempts: true,
  flag: true,
  machine: true,
  starterCode: true,
  orderIndex: true,
  prerequisiteId: true,
  attachmentUrl: true,
  resourceUrl: true,
} as const;

// ── Create ─────────────────────────────────────────────────────────────────────

export async function createChallengeAction(
  _prev: ChallengeFormState,
  formData: FormData,
): Promise<ChallengeFormState> {
  const admin = await requireAdminAction();
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }
  const machine = readMachine(formData);
  if (!machine.ok) return { fieldErrors: { machine: machine.error } };

  const { prerequisiteId, flag, starterCode, attachmentUrl, resourceUrl, ...rest } = parsed.data;

  let createdId: string;
  try {
    createdId = await prisma.$transaction(async (tx) => {
      const created = await tx.challenge.create({
        data: {
          ...rest,
          ...(flag ? { flag } : {}),
          ...(machine.machine ? { machine: machineJson(machine.machine) } : {}),
          ...(prerequisiteId ? { prerequisiteId } : {}),
          starterCode: starterCode ?? null,
          attachmentUrl: attachmentUrl ?? null,
          resourceUrl: resourceUrl ?? null,
        },
        select: { id: true },
      });
      await auditLogRepository.record(
        {
          actorId: admin.id,
          action: AUDIT_ACTION.challenge.create,
          targetType: TARGET,
          targetId: created.id,
          metadata: { refCode: rest.refCode, title: rest.title, type: rest.type },
        },
        tx,
      );
      return created.id;
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return { error: "Un challenge avec ce refCode ou ce slug existe déjà." };
    }
    return { error: "Erreur lors de la création du challenge." };
  }

  revalidatePath("/challenges");
  redirect(withSavedNotice(`/challenges/${createdId}/edit`, "created"));
}

// ── Update ─────────────────────────────────────────────────────────────────────

export async function updateChallengeAction(
  id: string,
  _prev: ChallengeFormState,
  formData: FormData,
): Promise<ChallengeFormState> {
  const admin = await requireAdminAction();
  if (!z.guid().safeParse(id).success) return { error: "ID invalide." };

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }
  const machine = readMachine(formData);
  if (!machine.ok) return { fieldErrors: { machine: machine.error } };

  const { prerequisiteId, flag, starterCode, attachmentUrl, resourceUrl, ...rest } = parsed.data;

  // What the row will hold, written so it compares with what it holds now.
  const fields = {
    ...rest,
    flag: flag ?? null,
    machine: machine.machine ? machineJson(machine.machine) : null,
    starterCode: starterCode ?? null,
    prerequisiteId: prerequisiteId ?? null,
    attachmentUrl: attachmentUrl ?? null,
    resourceUrl: resourceUrl ?? null,
  };

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const before = await tx.challenge.findUnique({ where: { id }, select: EDITABLE });
      if (!before) return "missing" as const;
      await tx.challenge.update({
        where: { id },
        data: { ...fields, machine: fields.machine ?? JSON_NULL_IN_DB },
      });
      await auditLogRepository.record(
        {
          actorId: admin.id,
          action: AUDIT_ACTION.challenge.update,
          targetType: TARGET,
          targetId: id,
          metadata: { changed: changedFields(before, fields) },
        },
        tx,
      );
      return "updated" as const;
    });
    if (outcome === "missing") return { error: "Ce challenge n'existe plus." };
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
  const admin = await requireAdminAction();
  if (!z.guid().safeParse(id).success) return { error: "ID invalide." };
  if (!z.boolean().safeParse(isActive).success) return { error: "État invalide." };

  await prisma.$transaction(async (tx) => {
    await tx.challenge.update({ where: { id }, data: { isActive } });
    await auditLogRepository.record(
      {
        actorId: admin.id,
        action: AUDIT_ACTION.challenge.activeUpdate,
        targetType: TARGET,
        targetId: id,
        metadata: { isActive },
      },
      tx,
    );
  });
  revalidatePath("/challenges");
  return {};
}

// ── Delete ─────────────────────────────────────────────────────────────────────

export async function deleteChallengeAction(id: string): Promise<{ error?: string }> {
  const admin = await requireAdminAction();
  if (!z.guid().safeParse(id).success) return { error: "ID invalide." };

  const existing = await prisma.challenge.findUnique({
    where: { id },
    select: { refCode: true, title: true },
  });
  // Already deleted, from another tab: back to the list.
  if (!existing) redirect("/challenges");

  const progress = await prisma.userChallengeProgress.count({ where: { challengeId: id } });
  if (progress > 0) {
    return {
      error: `Impossible de supprimer : ${String(progress)} progression(s) utilisateur liée(s).`,
    };
  }
  // A tournament's scores rest on its challenges: the foreign key refuses the
  // delete (RESTRICT), and this says why before it gets the chance.
  if (await tournamentRepository.isUsed(id)) {
    return { error: "Impossible de supprimer : ce défi a servi dans un tournoi. Désactive-le." };
  }

  // The title goes in the row: once the challenge is gone, the id alone says
  // nothing to whoever reads the log.
  await prisma.$transaction(async (tx) => {
    await tx.challenge.delete({ where: { id } });
    await auditLogRepository.record(
      {
        actorId: admin.id,
        action: AUDIT_ACTION.challenge.delete,
        targetType: TARGET,
        targetId: id,
        metadata: { refCode: existing.refCode, title: existing.title },
      },
      tx,
    );
  });
  revalidatePath("/challenges");
  redirect(withSavedNotice("/challenges", "deleted"));
}

// ── Hint CRUD ─────────────────────────────────────────────────────────────────

export async function createHintAction(
  challengeId: string,
  content: string,
  xpCost: number,
  orderIndex: number,
): Promise<{ error?: string }> {
  const admin = await requireAdminAction();
  if (!z.guid().safeParse(challengeId).success) return { error: "ID invalide." };

  const validated = z
    .object({
      content: z.string().trim().min(1),
      xpCost: z.number().int().min(0).max(1000),
      orderIndex: z.number().int().min(0),
    })
    .safeParse({ content, xpCost, orderIndex });

  if (!validated.success) return { error: "Données invalides." };

  // A hint's row is logged under its challenge, so /audit?target=<challenge>
  // shows the hints changing alongside the rest of it.
  try {
    await prisma.$transaction(async (tx) => {
      const hint = await tx.challengeHint.create({
        data: { challengeId, ...validated.data },
        select: { id: true },
      });
      await auditLogRepository.record(
        {
          actorId: admin.id,
          action: AUDIT_ACTION.challenge.hintCreate,
          targetType: TARGET,
          targetId: challengeId,
          metadata: { hintId: hint.id, xpCost: validated.data.xpCost },
        },
        tx,
      );
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
  const admin = await requireAdminAction();
  if (!z.guid().safeParse(hintId).success) return { error: "ID invalide." };

  const validated = z
    .object({
      content: z.string().trim().min(1),
      xpCost: z.number().int().min(0).max(1000),
    })
    .safeParse({ content, xpCost });

  if (!validated.success) return { error: "Données invalides." };

  try {
    await prisma.$transaction(async (tx) => {
      const hint = await tx.challengeHint.update({
        where: { id: hintId },
        data: validated.data,
        select: { challengeId: true },
      });
      await auditLogRepository.record(
        {
          actorId: admin.id,
          action: AUDIT_ACTION.challenge.hintUpdate,
          targetType: TARGET,
          targetId: hint.challengeId,
          metadata: { hintId, xpCost: validated.data.xpCost },
        },
        tx,
      );
    });
  } catch {
    return { error: "Erreur lors de la mise à jour de l'indice." };
  }

  revalidatePath("/challenges");
  return {};
}

export async function deleteHintAction(hintId: string): Promise<{ error?: string }> {
  const admin = await requireAdminAction();
  if (!z.guid().safeParse(hintId).success) return { error: "ID invalide." };

  try {
    await prisma.$transaction(async (tx) => {
      const hint = await tx.challengeHint.delete({
        where: { id: hintId },
        select: { challengeId: true },
      });
      await auditLogRepository.record(
        {
          actorId: admin.id,
          action: AUDIT_ACTION.challenge.hintDelete,
          targetType: TARGET,
          targetId: hint.challengeId,
          metadata: { hintId },
        },
        tx,
      );
    });
  } catch {
    return { error: "Erreur lors de la suppression de l'indice." };
  }

  revalidatePath("/challenges");
  return {};
}
