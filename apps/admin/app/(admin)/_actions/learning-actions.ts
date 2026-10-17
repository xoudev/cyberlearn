"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  LESSON_CORRECTIONS,
  lessonProgressRepository,
  notificationRepository,
  pathRepository,
  placementRepository,
  quizRepository,
} from "@cyberlearn/db";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { requireAdminAction } from "@/lib/auth";

/**
 * Corrections to what an account learned, short of starting it over: the
 * placement test sat again, the wait after an exam lifted, one lesson put
 * back or marked finished. "Remettre la progression à zéro" is the gesture
 * for everything at once; these are for the one thing that went wrong.
 *
 * Each correction and its audit row land in one transaction in its
 * repository, so a failure leaves both as they were.
 */

export interface LearningActionState {
  ok?: boolean;
  error?: string;
  /** What was done, in a sentence, once it is done. */
  notice?: string;
  /** True when the placement test was reset but the learner's notice was not written. */
  notifyFailed?: boolean;
}

const targetSchema = z.object({ userId: z.guid() });

/** Where the site's placement test begins; the app opens its own screen for it. */
const PLACEMENT_TEST_URL = "/onboarding/placement-test";

const day = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

// ─── Placement test ─────────────────────────────────────────────────────────

/**
 * Removes the placement test's result and the lessons it waived, and tells
 * the learner they can sit it again: the test is taken once, so nothing on
 * the site or in the app would offer it otherwise.
 */
export async function resetPlacementAction(
  _prev: LearningActionState,
  formData: FormData,
): Promise<LearningActionState> {
  const admin = await requireAdminAction();
  const parsed = targetSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Paramètres invalides." };
  const { userId } = parsed.data;

  let result: Awaited<ReturnType<typeof placementRepository.reset>>;
  try {
    result = await placementRepository.reset(userId, { actorId: admin.id });
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "resetPlacementAction failed");
    return { error: "La remise à zéro a échoué. Rien n'a été effacé." };
  }
  if (!result.ok) return { error: "Ce compte n'a pas passé le test de positionnement." };

  // After the reset, never before it: the notice is then always true, and a
  // notice that is not written is a missing one rather than a false one.
  let notifyFailed = false;
  try {
    await notificationRepository.create({
      userId,
      type: "ANNOUNCEMENT",
      title: "Ton test de positionnement est à repasser",
      body: "L'équipe l'a remis à zéro. Repasse-le quand tu veux : il sert à te proposer les bons parcours.",
      actionUrl: PLACEMENT_TEST_URL,
    });
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "placement reset notice failed");
    notifyFailed = true;
  }

  revalidatePath(`/users/${userId}`);
  const { scores, waiversRemoved } = result;
  const waivers =
    waiversRemoved === 0
      ? "Aucune leçon n'était dispensée."
      : `${String(waiversRemoved)} leçon${waiversRemoved > 1 ? "s ne sont plus dispensées" : " n'est plus dispensée"} : celles déjà terminées le restent.`;
  return {
    ok: true,
    notice: `Test de positionnement remis à zéro (il donnait : développement ${String(scores.dev)} %, cybersécurité ${String(scores.cybersec)} %, réseau ${String(scores.network)} %). ${waivers}`,
    notifyFailed,
  };
}

// ─── Exam wait ──────────────────────────────────────────────────────────────

const waiveSchema = targetSchema.extend({ pathId: z.guid() });

/**
 * Lets the learner sit a path's exam again now, rather than at the end of the
 * 48 hours: those of an attempt handed in, or those an attempt never handed in
 * and out of time would begin at the next start, which is closed instead.
 */
export async function waiveExamCooldownAction(
  _prev: LearningActionState,
  formData: FormData,
): Promise<LearningActionState> {
  const admin = await requireAdminAction();
  const parsed = waiveSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Paramètres invalides." };
  const { userId, pathId } = parsed.data;

  let result: Awaited<ReturnType<typeof quizRepository.waiveCooldown>>;
  try {
    result = await quizRepository.waiveCooldown(userId, pathId, { actorId: admin.id });
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "waiveExamCooldownAction failed");
    return { error: "La levée du délai a échoué. Rien n'a été modifié." };
  }
  if (!result.ok) {
    return {
      error:
        result.reason === "NO_EXAM"
          ? "Ce parcours n'a pas d'examen."
          : "Aucun délai d'attente à lever sur cet examen. Recharge la page pour voir où il en est.",
    };
  }

  revalidatePath(`/users/${userId}`);
  if (result.kind === "expired") {
    return {
      ok: true,
      notice: `Tentative du ${day.format(result.startedAt)} close à 0 %, sans délai d'attente : l'examen « ${result.pathTitle} » peut être repassé dès maintenant. Jamais rendue, elle aurait imposé 48 h d'attente à la prochaine reprise.`,
    };
  }
  return {
    ok: true,
    notice: `Délai levé : l'examen « ${result.pathTitle} » peut être repassé dès maintenant. Il aurait rouvert le ${day.format(result.waitEndedAt)}.`,
  };
}

// ─── One lesson ─────────────────────────────────────────────────────────────

const correctionSchema = targetSchema.extend({
  lessonId: z.guid("Choisis une leçon."),
  mode: z.enum(LESSON_CORRECTIONS, "Choisis la correction à faire."),
});

/**
 * Puts one lesson back to never opened, or marks it finished without paying
 * anything. After marking one finished, says which paths that completes, and
 * what opens for them: the exam, or the certificate to claim from the path's
 * page. The console does not issue it: the certificate is the learning loop's.
 */
export async function correctLessonProgressAction(
  _prev: LearningActionState,
  formData: FormData,
): Promise<LearningActionState> {
  const admin = await requireAdminAction();
  const parsed = correctionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Paramètres invalides." };
  const { userId, lessonId, mode } = parsed.data;

  let result: Awaited<ReturnType<typeof lessonProgressRepository.correct>>;
  try {
    result = await lessonProgressRepository.correct(userId, lessonId, mode, {
      actorId: admin.id,
    });
  } catch (error) {
    logger.error(
      { scope: "admin", err: errorMessage(error) },
      "correctLessonProgressAction failed",
    );
    return { error: "La correction a échoué. Rien n'a été modifié." };
  }

  if (!result.ok) {
    switch (result.reason) {
      case "NO_LESSON":
        return { error: "Cette leçon n'existe plus." };
      case "NOTHING_TO_RESET":
        return { error: "Ce compte n'a rien fait sur cette leçon." };
      case "ALREADY_COMPLETED":
        return { error: "Cette leçon est déjà terminée." };
    }
  }

  revalidatePath(`/users/${userId}`);

  if (result.mode === "reset") {
    const answers = result.answersRemoved;
    const cards = result.cardsRemoved;
    return {
      ok: true,
      notice: `Leçon « ${result.lessonTitle} » remise à zéro, avec ${String(answers)} réponse${answers > 1 ? "s" : ""} aux quiz et ${String(cards)} carte${cards > 1 ? "s" : ""} de révision. L'XP déjà gagnée reste acquise, et la terminer de nouveau la rapportera encore. Un parcours déjà terminé le reste.`,
    };
  }

  let opened = "";
  try {
    opened = await pathsCompletedBy(userId, lessonId);
  } catch (error) {
    // The lesson is marked finished either way; only the summary is missing.
    logger.error({ scope: "admin", err: errorMessage(error) }, "path re-evaluation failed");
  }
  return {
    ok: true,
    notice: `Leçon « ${result.lessonTitle} » marquée terminée, sans XP ni badge.${opened}`,
  };
}

/**
 * The catalogue paths the lesson belongs to that now have every mission done
 * and are not finished yet, with what that opens, as a sentence to append.
 */
async function pathsCompletedBy(userId: string, lessonId: string): Promise<string> {
  const paths = await pathRepository.findPublishedPathsForLesson(lessonId);
  const lines: string[] = [];
  for (const path of paths) {
    const [complete, progress, exam] = await Promise.all([
      pathRepository.areLessonsComplete(userId, path.id),
      pathRepository.findProgress(userId, path.id),
      quizRepository.findActiveQuizByPathId(path.id),
    ]);
    if (!complete || progress?.status === "COMPLETED") continue;
    lines.push(
      exam !== null
        ? `« ${path.title} » a toutes ses missions faites : son examen est ouvert.`
        : `« ${path.title} » a toutes ses missions faites : l'attestation se réclame depuis la page du parcours.`,
    );
  }
  return lines.length === 0 ? "" : ` ${lines.join(" ")}`;
}
