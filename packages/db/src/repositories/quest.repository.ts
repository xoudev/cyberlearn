import type { QuestType } from "@prisma/client";
import { prisma } from "../prisma.js";

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
   * Active quests joined with the user's progress for `weekKey`. Quests with no
   * progress row yet (fresh week) come back at progress 0 / not completed.
   */
  async findWeek(userId: string, weekKey: string): Promise<QuestWithProgress[]> {
    const [quests, rows] = await Promise.all([
      prisma.quest.findMany({ where: { isActive: true }, orderBy: { orderIndex: "asc" } }),
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
};
