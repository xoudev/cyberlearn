import type { Category, Difficulty } from "@prisma/client";
import { AUDIT_ACTION } from "../audit-actions.js";
import { prisma } from "../prisma.js";
import { CATALOGUE_LESSON } from "./lesson.repository.js";
import { CATALOGUE_PATH } from "./path.repository.js";

/**
 * The placement test: what the site's pages and the app's screen read and
 * write to run it (the service is apps/web/lib/onboarding/placement.ts), and
 * the console's side of it.
 *
 * The test is taken once: its pages and the app's screen send anybody with a
 * result elsewhere. A test sat in a hurry, or by somebody who has since
 * learned what it asks, therefore stayed on the account for good, with the
 * lessons it waived. Resetting it is the only way to sit it again.
 */

/** Why the test waives a lesson: the default of UserSkipWaiver.grantReason. */
export const PLACEMENT_WAIVER_REASON = "placement_test";

/** The audit action of a placement test reset from the console. */
export const PLACEMENT_RESET_ACTION = AUDIT_ACTION.user.placementReset;

export type PlacementResetResult =
  | { ok: true; scores: { dev: number; cybersec: number; network: number }; waiversRemoved: number }
  | { ok: false; reason: "NO_RESULT" };

export const placementRepository = {
  /** Whether the account has a result: the test is taken once. */
  async hasResult(userId: string): Promise<boolean> {
    const result = await prisma.userPlacementResult.findUnique({
      where: { userId },
      select: { id: true },
    });
    return result !== null;
  },

  /** The account's three scores, or null when it never sat the test. */
  async findScoresFor(userId: string) {
    return prisma.userPlacementResult.findUnique({
      where: { userId },
      select: { devScore: true, cybersecScore: true, networkScore: true },
    });
  },

  /** How many questions the test asks: the active ones. */
  async countActiveQuestions(): Promise<number> {
    return prisma.placementQuestion.count({ where: { isActive: true } });
  },

  /**
   * The active questions with their options, by domain then in order, and
   * never the right option nor the explanation that gives it away: what is
   * not selected here cannot reach a browser.
   */
  async listActiveQuestions() {
    return prisma.placementQuestion.findMany({
      where: { isActive: true },
      select: { id: true, category: true, difficulty: true, question: true, options: true },
      orderBy: [{ category: "asc" }, { orderIndex: "asc" }],
    });
  },

  /**
   * The key to correct a submission with: the domain and the right option of
   * those of `questionIds` that are active. Read on the server, for scoring,
   * and nowhere else.
   */
  async findAnswerKey(questionIds: readonly string[]) {
    return prisma.placementQuestion.findMany({
      where: { id: { in: [...questionIds] }, isActive: true },
      select: { id: true, category: true, correctOptionId: true },
    });
  },

  /**
   * The lessons a mastered domain waives: the given difficulties of the
   * catalogue only. A placement test waives lessons someone has shown they do
   * not need; a class's own material is not something the platform can decide
   * they already know, and the test runs at onboarding, before they are in any
   * class.
   */
  async findLessonIdsToWaive(
    categories: readonly Category[],
    difficulties: readonly Difficulty[],
  ): Promise<string[]> {
    if (categories.length === 0) return [];
    const lessons = await prisma.lesson.findMany({
      where: {
        category: { in: [...categories] },
        difficulty: { in: [...difficulties] },
        ...CATALOGUE_LESSON,
      },
      select: { id: true },
    });
    return lessons.map((lesson) => lesson.id);
  },

  /**
   * Keeps the result and waives the lessons, together: a result without its
   * waivers would tell the learner something the lessons then contradict.
   */
  async saveResult(
    userId: string,
    scores: { devScore: number; cybersecScore: number; networkScore: number },
    waivedLessonIds: readonly string[],
  ): Promise<void> {
    await prisma.$transaction([
      prisma.userPlacementResult.create({
        data: {
          userId,
          devScore: scores.devScore,
          cybersecScore: scores.cybersecScore,
          networkScore: scores.networkScore,
        },
      }),
      ...waivedLessonIds.map((lessonId) =>
        prisma.userSkipWaiver.upsert({
          where: { userId_lessonId: { userId, lessonId } },
          create: { userId, lessonId },
          update: {},
        }),
      ),
    ]);
  },

  /**
   * The catalogue path to recommend for a domain: its easiest. A catalogue
   * path, because a class's own is not something to recommend to a newcomer
   * who is in no class yet. Null when the domain has none.
   */
  async findPathSlugToRecommend(category: Category): Promise<string | null> {
    const path = await prisma.path.findFirst({
      where: { category, ...CATALOGUE_PATH },
      orderBy: { difficulty: "asc" },
      select: { slug: true },
    });
    return path?.slug ?? null;
  },

  /**
   * Removes the account's result and the lessons the test waived, so that it
   * can sit the test again. Lessons it finished stay finished: a waiver only
   * opened them, and the progress is its own. Waivers granted for any other
   * reason stay too.
   *
   * One transaction, with its audit row, which keeps the scores that went.
   */
  async reset(userId: string, by: { actorId: string }): Promise<PlacementResetResult> {
    return prisma.$transaction(async (tx): Promise<PlacementResetResult> => {
      const result = await tx.userPlacementResult.findUnique({
        where: { userId },
        select: { id: true, devScore: true, cybersecScore: true, networkScore: true },
      });
      if (result === null) return { ok: false, reason: "NO_RESULT" };

      await tx.userPlacementResult.delete({ where: { id: result.id } });
      const waivers = await tx.userSkipWaiver.deleteMany({
        where: { userId, grantReason: PLACEMENT_WAIVER_REASON },
      });
      const scores = {
        dev: result.devScore,
        cybersec: result.cybersecScore,
        network: result.networkScore,
      };
      await tx.auditLog.create({
        data: {
          actorId: by.actorId,
          action: PLACEMENT_RESET_ACTION,
          targetType: "User",
          targetId: userId,
          metadata: { ...scores, waiversRemoved: waivers.count },
        },
      });
      return { ok: true, scores, waiversRemoved: waivers.count };
    });
  },

  /**
   * When the console last reset the account's test, read from the audit log
   * the reset writes. An account without a result is then one that was asked
   * to sit it again, not one that never did.
   */
  async lastResetAt(userId: string): Promise<Date | null> {
    const row = await prisma.auditLog.findFirst({
      where: { targetType: "User", targetId: userId, action: PLACEMENT_RESET_ACTION },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    return row?.createdAt ?? null;
  },

  /** The account's scores, for its GDPR export (rgpd/build-export.ts); null when it never sat the test. */
  async exportResultFor(userId: string) {
    return prisma.userPlacementResult.findUnique({
      where: { userId },
      select: { devScore: true, cybersecScore: true, networkScore: true, completedAt: true },
    });
  },

  /**
   * Every lesson waived for the account, by the test or for any other reason,
   * for its GDPR export (rgpd/build-export.ts).
   */
  async exportSkipWaiversFor(userId: string) {
    return prisma.userSkipWaiver.findMany({
      where: { userId },
      select: {
        grantedAt: true,
        grantReason: true,
        lesson: { select: { title: true, slug: true } },
      },
    });
  },
};
