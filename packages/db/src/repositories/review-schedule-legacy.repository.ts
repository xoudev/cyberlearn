import { prisma } from "../prisma.js";

// The retired SM-2 queue's rows (review_schedules_legacy) wait there until
// db:backfill-review-cards has run in production, and a later release drops
// the table (docs/DEPLOY.md). Nothing writes them. Two things read them: the
// conversion script, on its own client, and the GDPR export, here. The
// platform still holds these rows, so a learner's export lists them. This read
// goes with the table.

/** One row of the retired queue, as the GDPR export lists it. */
export interface LegacyReviewScheduleExportRow {
  lessonTitle: string;
  lessonSlug: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: Date;
  lastReviewedAt: Date;
}

export const reviewScheduleLegacyRepository = {
  /** A learner's rows of the retired queue, for the GDPR export, soonest due first. */
  async listForExport(userId: string): Promise<LegacyReviewScheduleExportRow[]> {
    const rows = await prisma.reviewScheduleLegacy.findMany({
      where: { userId },
      orderBy: [{ nextReviewAt: "asc" }, { id: "asc" }],
      select: {
        easeFactor: true,
        intervalDays: true,
        repetitions: true,
        nextReviewAt: true,
        lastReviewedAt: true,
        lesson: { select: { title: true, slug: true } },
      },
    });
    return rows.map((row) => ({
      lessonTitle: row.lesson.title,
      lessonSlug: row.lesson.slug,
      easeFactor: row.easeFactor,
      intervalDays: row.intervalDays,
      repetitions: row.repetitions,
      nextReviewAt: row.nextReviewAt,
      lastReviewedAt: row.lastReviewedAt,
    }));
  },
};
