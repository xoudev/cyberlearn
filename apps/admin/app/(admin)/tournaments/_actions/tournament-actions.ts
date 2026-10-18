"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  auditLogRepository,
  LIVE_CLASS_FILTER,
  prisma,
  tournamentRepository,
  type Prisma,
} from "@cyberlearn/db";
import { AUDIT_ACTION, type AuditAction } from "@cyberlearn/db/audit-actions";
import {
  parisLocalToDate,
  TOURNAMENT_LIMITS,
  tournamentPhase,
  windowProblem,
} from "@cyberlearn/lib/challenges/tournament";
import { requireAdminAction } from "@/lib/auth";
import { withSavedNotice } from "@/lib/saved-notice";
import { announceTournament } from "@/lib/tournament-notice";

/**
 * Composing a CTF tournament: its window, its classes, its challenges and
 * what each is worth. Every action goes through requireAdminAction (the ADMIN
 * role read from the database, a completed TOTP challenge).
 *
 * Before the start everything can change. Once it runs, the scores rest on
 * the classes and the challenges, so only the title, the description and the
 * end move; once over, the title and the description.
 */

export interface TournamentFormState {
  error?: string;
  ok?: boolean;
}

const detailsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Un titre de 3 caractères au moins.")
    .max(TOURNAMENT_LIMITS.titleMax, "Le titre est trop long."),
  description: z
    .string()
    .trim()
    .max(TOURNAMENT_LIMITS.descriptionMax, "La description est trop longue."),
  startsAt: z.string().trim(),
  endsAt: z.string().trim(),
});

const compositionSchema = z.object({
  teamScope: z.enum(["CLASS", "ESTABLISHMENT"], "Choisis qui joue contre qui."),
  classIds: z
    .array(z.guid())
    .min(1, "Choisis au moins une classe.")
    .max(TOURNAMENT_LIMITS.maxClasses, "Trop de classes pour un tournoi."),
  challenges: z
    .array(
      z.object({
        challengeId: z.guid(),
        points: z.coerce
          .number()
          .int("Des points entiers.")
          .min(TOURNAMENT_LIMITS.pointsMin, "Un défi vaut au moins 10 points.")
          .max(TOURNAMENT_LIMITS.pointsMax, "Un défi vaut au plus 1000 points."),
      }),
    )
    .min(1, "Choisis au moins un défi.")
    .max(TOURNAMENT_LIMITS.maxChallenges, "Trop de défis pour un tournoi."),
});

type Composition = z.infer<typeof compositionSchema>;

const idSchema = z.guid();

function strings(values: FormDataEntryValue[]): string[] {
  return [...new Set(values.filter((v): v is string => typeof v === "string"))];
}

function readDetails(formData: FormData) {
  return detailsSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    startsAt: formData.get("startsAt") ?? "",
    endsAt: formData.get("endsAt") ?? "",
  });
}

function readComposition(formData: FormData) {
  return compositionSchema.safeParse({
    teamScope: formData.get("teamScope"),
    classIds: strings(formData.getAll("classIds")),
    // In the order the form lists them: the order the tournament shows them.
    challenges: strings(formData.getAll("challengeIds")).map((challengeId) => ({
      challengeId,
      points: formData.get(`points:${challengeId}`),
    })),
  });
}

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Champs invalides.";
}

/** The two datetime-local values, read as Paris time and checked as a window. */
function readWindow(
  startsAt: string,
  endsAt: string,
): { ok: true; startsAt: Date; endsAt: Date } | { ok: false; error: string } {
  const start = parisLocalToDate(startsAt);
  const end = parisLocalToDate(endsAt);
  if (start === null || end === null) return { ok: false, error: "Une des dates ne se lit pas." };
  const problem = windowProblem({ startsAt: start, endsAt: end });
  return problem === null
    ? { ok: true, startsAt: start, endsAt: end }
    : { ok: false, error: problem };
}

/** Why these classes and challenges cannot make a tournament, or null. */
async function compositionProblem(composition: Composition): Promise<string | null> {
  const [classes, challenges] = await Promise.all([
    prisma.class.count({ where: { id: { in: composition.classIds }, ...LIVE_CLASS_FILTER } }),
    prisma.challenge.findMany({
      where: { id: { in: composition.challenges.map((c) => c.challengeId) } },
      select: { title: true, type: true, flag: true, machine: true },
    }),
  ]);
  if (classes !== composition.classIds.length) {
    return "Une des classes n'existe plus, ou a été archivée.";
  }
  if (challenges.length !== composition.challenges.length) return "Un des défis n'existe plus.";
  for (const challenge of challenges) {
    if (challenge.type !== "CTF" && challenge.type !== "SCRIPT") {
      return `« ${challenge.title} » ne se valide pas par un flag : il ne peut pas servir ici.`;
    }
    if (challenge.flag === null && challenge.machine === null) {
      return `« ${challenge.title} » n'a pas de flag.`;
    }
  }
  return null;
}

async function audit(
  actorId: string,
  action: AuditAction,
  targetId: string,
  metadata: Prisma.InputJsonObject,
): Promise<void> {
  await auditLogRepository.record({
    actorId,
    action,
    targetType: "Tournament",
    targetId,
    metadata,
  });
}

export async function createTournamentAction(
  _prev: TournamentFormState,
  formData: FormData,
): Promise<TournamentFormState> {
  const admin = await requireAdminAction();
  const details = readDetails(formData);
  if (!details.success) return { error: firstIssue(details.error) };
  const composition = readComposition(formData);
  if (!composition.success) return { error: firstIssue(composition.error) };
  const window = readWindow(details.data.startsAt, details.data.endsAt);
  if (!window.ok) return { error: window.error };
  if (window.endsAt.getTime() <= Date.now()) return { error: "Ce tournoi serait déjà terminé." };
  const problem = await compositionProblem(composition.data);
  if (problem !== null) return { error: problem };

  const created = await tournamentRepository.create({
    title: details.data.title,
    description: details.data.description,
    startsAt: window.startsAt,
    endsAt: window.endsAt,
    teamScope: composition.data.teamScope,
    createdById: admin.id,
    classIds: composition.data.classIds,
    challenges: composition.data.challenges,
  });
  await audit(admin.id, AUDIT_ACTION.tournament.create, created.id, {
    title: details.data.title,
    classes: composition.data.classIds.length,
    challenges: composition.data.challenges.length,
  });
  await announceTournament(
    {
      id: created.id,
      title: details.data.title,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      teamScope: composition.data.teamScope,
    },
    composition.data.classIds,
  );
  revalidatePath("/tournaments");
  redirect(withSavedNotice(`/tournaments/${created.id}`, "created"));
}

export async function updateTournamentAction(
  id: string,
  _prev: TournamentFormState,
  formData: FormData,
): Promise<TournamentFormState> {
  const admin = await requireAdminAction();
  if (!idSchema.safeParse(id).success) return { error: "Tournoi introuvable." };
  const existing = await tournamentRepository.findForConsole(id);
  if (existing === null) return { error: "Tournoi introuvable." };
  const details = readDetails(formData);
  if (!details.success) return { error: firstIssue(details.error) };
  const now = new Date();
  const phase = tournamentPhase(existing, now);

  if (phase === "UPCOMING") {
    const composition = readComposition(formData);
    if (!composition.success) return { error: firstIssue(composition.error) };
    const window = readWindow(details.data.startsAt, details.data.endsAt);
    if (!window.ok) return { error: window.error };
    if (window.endsAt.getTime() <= now.getTime()) {
      return { error: "Ce tournoi serait déjà terminé." };
    }
    const problem = await compositionProblem(composition.data);
    if (problem !== null) return { error: problem };
    await tournamentRepository.update(id, {
      title: details.data.title,
      description: details.data.description,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      teamScope: composition.data.teamScope,
      classIds: composition.data.classIds,
      challenges: composition.data.challenges,
    });
    // A class added since the tournament was announced hears of it now.
    const before = new Set(existing.classes.map((c) => c.classId));
    const added = composition.data.classIds.filter((classId) => !before.has(classId));
    await announceTournament(
      {
        id,
        title: details.data.title,
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        teamScope: composition.data.teamScope,
      },
      added,
    );
  } else if (phase === "RUNNING") {
    const endsAt = parisLocalToDate(details.data.endsAt);
    if (endsAt === null) return { error: "La date de fin ne se lit pas." };
    if (endsAt.getTime() <= now.getTime()) {
      return { error: "Pour l'arrêter maintenant, utilise « Terminer maintenant »." };
    }
    const problem = windowProblem({ startsAt: existing.startsAt, endsAt });
    if (problem !== null) return { error: problem };
    await tournamentRepository.update(id, {
      title: details.data.title,
      description: details.data.description,
      startsAt: existing.startsAt,
      endsAt,
    });
  } else {
    await tournamentRepository.update(id, {
      title: details.data.title,
      description: details.data.description,
      startsAt: existing.startsAt,
      endsAt: existing.endsAt,
    });
  }

  await audit(admin.id, AUDIT_ACTION.tournament.update, id, { phase, title: details.data.title });
  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${id}`);
  return { ok: true };
}

export async function deleteTournamentAction(id: string): Promise<TournamentFormState> {
  const admin = await requireAdminAction();
  if (!idSchema.safeParse(id).success) return { error: "Tournoi introuvable." };
  const deleted = await tournamentRepository.deleteUpcoming(id, new Date());
  if (!deleted) {
    return { error: "Un tournoi commencé ne se supprime pas : ses scores restent. Arrête-le." };
  }
  await audit(admin.id, AUDIT_ACTION.tournament.delete, id, {});
  revalidatePath("/tournaments");
  redirect(withSavedNotice("/tournaments", "deleted"));
}

export async function endTournamentNowAction(id: string): Promise<TournamentFormState> {
  const admin = await requireAdminAction();
  if (!idSchema.safeParse(id).success) return { error: "Tournoi introuvable." };
  const ended = await tournamentRepository.endNow(id, new Date());
  if (!ended) return { error: "Ce tournoi n'est pas en cours." };
  await audit(admin.id, AUDIT_ACTION.tournament.end, id, {});
  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${id}`);
  return { ok: true };
}

// ─── Flags ──────────────────────────────────────────────────────────────────

export interface SolveActionState {
  ok?: boolean;
  error?: string;
}

const disqualifySchema = z.object({
  tournamentId: z.guid(),
  solveId: z.guid(),
  /**
   * Required: the player reads it in their data export, and a flag taken back
   * with no reason is one nobody can answer.
   */
  reason: z
    .string()
    .trim()
    .min(5, "Explique le motif : au moins 5 caractères.")
    .max(300, "Le motif tient en 300 caractères au plus."),
});

const requalifySchema = z.object({ tournamentId: z.guid(), solveId: z.guid() });

const SOLVE_GONE = "Ce flag n'existe plus dans ce tournoi.";

/** The pages that count the flag: its list, the tournament's standings, the list of tournaments. */
function revalidateSolves(tournamentId: string): void {
  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/flags`);
}

/**
 * Takes a flag back: it stays recorded so the player cannot score it again,
 * and it leaves every scoreboard, on the site and in the app. The repository
 * writes it and its audit row in one transaction, only on a flag that still
 * counts: a second click, or a second administrator, changes nothing.
 */
export async function disqualifySolveAction(
  _prev: SolveActionState,
  formData: FormData,
): Promise<SolveActionState> {
  const admin = await requireAdminAction();
  const parsed = disqualifySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { tournamentId } = parsed.data;

  const result = await tournamentRepository.disqualifySolve({
    tournamentId,
    solveId: parsed.data.solveId,
    actorId: admin.id,
    reason: parsed.data.reason,
    now: new Date(),
  });
  revalidateSolves(tournamentId);
  if (!result.ok) {
    return { error: result.reason === "NOT_FOUND" ? SOLVE_GONE : "Ce flag est déjà disqualifié." };
  }
  return { ok: true };
}

/** Puts a disqualified flag back, for a disqualification made in error. Traced too. */
export async function requalifySolveAction(
  _prev: SolveActionState,
  formData: FormData,
): Promise<SolveActionState> {
  const admin = await requireAdminAction();
  const parsed = requalifySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Paramètres invalides." };
  const { tournamentId } = parsed.data;

  const result = await tournamentRepository.requalifySolve({
    tournamentId,
    solveId: parsed.data.solveId,
    actorId: admin.id,
  });
  revalidateSolves(tournamentId);
  if (!result.ok) {
    return { error: result.reason === "NOT_FOUND" ? SOLVE_GONE : "Ce flag compte déjà." };
  }
  return { ok: true };
}
