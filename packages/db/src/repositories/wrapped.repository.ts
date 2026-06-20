import type { Prisma, WrappedPeriod } from "@prisma/client";
import { assembleWrapped, type WrappedPayload } from "@cyberlearn/lib";
import { prisma } from "../prisma.js";
import { leagueRepository } from "./league.repository.js";
import { streakRepository } from "./streak.repository.js";

export const wrappedRepository = {
  /**
   * Compute the curated recap payload for a user + month (read-only). Gathers a
   * few bounded per-user lists and hands them to the pure assembler in
   * @cyberlearn/lib, where all the stat logic lives (and is unit-tested).
   */
  async buildPayload(userId: string, periodKey: string): Promise<WrappedPayload | null> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { level: true } });
    if (!user) return null;

    const [xpEntries, lessons, badges, totalBadges, overview, season] = await Promise.all([
      prisma.xpLedger.findMany({ where: { userId }, select: { amount: true, createdAt: true } }),
      prisma.userLessonProgress.findMany({
        where: { userId, status: "COMPLETED", completedAt: { not: null } },
        select: { completedAt: true, lesson: { select: { category: true } } },
      }),
      prisma.userBadge.findMany({
        where: { userId },
        select: { earnedAt: true, badge: { select: { rarity: true, name: true } } },
      }),
      prisma.userBadge.count({ where: { userId } }),
      streakRepository.getOverview(userId),
      leagueRepository.getLatestClosedSeasonResult(userId),
    ]);

    return assembleWrapped({
      periodKey,
      xpEntries,
      lessons: lessons.flatMap((l) =>
        l.completedAt ? [{ completedAt: l.completedAt, category: l.lesson.category }] : [],
      ),
      badges: badges.map((b) => ({
        earnedAt: b.earnedAt,
        rarity: b.badge.rarity,
        name: b.badge.name,
      })),
      totalBadges,
      longestStreak: overview?.longestStreak ?? 0,
      daysThisYear: overview?.daysThisYear ?? 0,
      level: user.level,
      season,
    });
  },

  /** A stored snapshot's curated payload, or null when none is frozen yet. */
  async findSnapshot(
    userId: string,
    period: WrappedPeriod,
    periodKey: string,
  ): Promise<WrappedPayload | null> {
    const row = await prisma.wrappedSnapshot.findUnique({
      where: { userId_period_periodKey: { userId, period, periodKey } },
      select: { payload: true },
    });
    if (!row) return null;
    // The payload was written by saveSnapshot as a WrappedPayload; Prisma types
    // it only as the broad JsonValue, so assert the (known) shape on the way out.
    return row.payload as unknown as WrappedPayload;
  },

  /** Persist (upsert) a curated snapshot payload for a user + period. */
  async saveSnapshot(
    userId: string,
    period: WrappedPeriod,
    periodKey: string,
    payload: WrappedPayload,
  ): Promise<void> {
    // WrappedPayload is plain JSON-serializable data; Prisma's InputJsonValue
    // type rejects the nested `| null` fields at compile time even though they
    // are valid JSON, so assert the (correct) JSON shape here.
    const data = payload as unknown as Prisma.InputJsonValue;
    await prisma.wrappedSnapshot.upsert({
      where: { userId_period_periodKey: { userId, period, periodKey } },
      create: { userId, period, periodKey, payload: data },
      update: { payload: data },
    });
  },
};
