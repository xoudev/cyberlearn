import type { Prisma, QuestType } from "@prisma/client";
import { BONUS_QUEST_TYPE, pickWeekQuests } from "@cyberlearn/lib";
import { prisma } from "../prisma.js";

type QuestRow = Prisma.QuestGetPayload<Record<string, never>>;

/** A quest plus the current user's progress for a given week. */
export interface QuestWithProgress {
  id: string;
  code: string;
  title: string;
  description: string;
  type: QuestType;
  target: number;
  xpReward: number;
  freezeReward: number;
  orderIndex: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export const questRepository = {
  /** All active quests, ordered for display. */
  async listActive() {
    return prisma.quest.findMany({ where: { isActive: true }, orderBy: { orderIndex: "asc" } });
  },

  /**
   * The quests `weekKey` asks for, in display order, the completion bonus
   * last: the same for everyone. Drawn from the active pool on the week's
   * first read (pickWeekQuests, leaving out the quests of `previousWeekKey`
   * where it can) and stored, so that a change to the pool does not move the
   * quests of a week under way. Two first reads racing store the same draw:
   * the second insert skips the rows the first one wrote.
   */
  async ensureWeek(weekKey: string, previousWeekKey: string): Promise<QuestRow[]> {
    const stored = await weekRows(weekKey);
    if (stored.length > 0) return stored;

    const [pool, previous] = await Promise.all([
      prisma.quest.findMany({ where: { isActive: true } }),
      prisma.weeklyQuestSet.findMany({
        where: { weekKey: previousWeekKey },
        select: { questId: true },
      }),
    ]);
    const drawn = pickWeekQuests(pool, weekKey, new Set(previous.map((row) => row.questId)));
    const bonus = pool.find((quest) => quest.type === BONUS_QUEST_TYPE);
    const week = bonus ? [...drawn, bonus] : drawn;
    if (week.length === 0) return [];
    await prisma.weeklyQuestSet.createMany({
      data: week.map((quest, position) => ({ weekKey, questId: quest.id, position })),
      skipDuplicates: true,
    });
    return weekRows(weekKey);
  },

  /**
   * The week's quests (ensureWeek) joined with the user's progress. Quests
   * with no progress row yet come back at progress 0, not completed.
   */
  async findWeek(
    userId: string,
    weekKey: string,
    previousWeekKey: string,
  ): Promise<QuestWithProgress[]> {
    const [quests, rows] = await Promise.all([
      questRepository.ensureWeek(weekKey, previousWeekKey),
      prisma.userQuestProgress.findMany({
        where: { userId, weekKey },
        select: { questId: true, progress: true, completed: true, claimed: true },
      }),
    ]);
    const byQuest = new Map(rows.map((r) => [r.questId, r]));
    return quests.map((q) => {
      const p = byQuest.get(q.id);
      return {
        id: q.id,
        code: q.code,
        title: q.title,
        description: q.description,
        type: q.type,
        target: q.target,
        xpReward: q.xpReward,
        freezeReward: q.freezeReward,
        orderIndex: q.orderIndex,
        progress: p?.progress ?? 0,
        completed: p?.completed ?? false,
        claimed: p?.claimed ?? false,
      };
    });
  },

  /** The account's progress on every week's quests, for its GDPR export (rgpd/build-export.ts). */
  async exportProgressFor(userId: string) {
    return prisma.userQuestProgress.findMany({
      where: { userId },
      select: {
        weekKey: true,
        progress: true,
        completed: true,
        claimed: true,
        completedAt: true,
      },
    });
  },
};

/** The quests stored for a week, in their order. */
async function weekRows(weekKey: string): Promise<QuestRow[]> {
  const rows = await prisma.weeklyQuestSet.findMany({
    where: { weekKey },
    orderBy: { position: "asc" },
    select: { quest: true },
  });
  return rows.map((row) => row.quest);
}
