/**
 * The week's quests as the reader sees them, the same on the site's dashboard
 * and in the app: which are the four to do and which is the completion bonus,
 * where each one stands, how far the week is done, and the words for all of
 * it. Progress and claiming are the server's; this only reads them.
 */

export interface WeekQuestView {
  id: string;
  title: string;
  type: string;
  target: number;
  xpReward: number;
  freezeReward: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

/** Where a quest stands: done and cashed, done and waiting, or under way. */
export type QuestState = "claimed" | "claimable" | "running";

export function questState(quest: Pick<WeekQuestView, "completed" | "claimed">): QuestState {
  if (quest.claimed) return "claimed";
  if (quest.completed) return "claimable";
  return "running";
}

/** How far a quest is, 0 to 100. */
export function questProgressPct(quest: Pick<WeekQuestView, "progress" | "target">): number {
  if (quest.target <= 0) return 0;
  return Math.min(100, Math.round((quest.progress / quest.target) * 100));
}

/** The quests to do, and the bonus for doing them all, kept apart as the dashboard shows them. */
export function splitWeekQuests<T extends { type: string }>(
  quests: readonly T[],
): { main: T[]; bonus: T | null } {
  return {
    main: quests.filter((quest) => quest.type !== "WEEKLY_BONUS"),
    bonus: quests.find((quest) => quest.type === "WEEKLY_BONUS") ?? null,
  };
}

/** The week's completion: quests claimed out of the four, and the XP that stands for. */
export function weekCompletion(main: readonly Pick<WeekQuestView, "claimed" | "xpReward">[]): {
  claimedCount: number;
  total: number;
  pct: number;
  claimedXp: number;
  totalXp: number;
} {
  const claimed = main.filter((quest) => quest.claimed);
  return {
    claimedCount: claimed.length,
    total: main.length,
    pct: main.length > 0 ? Math.round((claimed.length / main.length) * 100) : 0,
    claimedXp: claimed.reduce((sum, quest) => sum + quest.xpReward, 0),
    totalXp: main.reduce((sum, quest) => sum + quest.xpReward, 0),
  };
}

/** "2j 5h 12m" until the week turns over. */
export function fmtWeekReset(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  return `${String(d)}j ${String(h)}h ${String(m)}m`;
}

export const QUEST_COPY = {
  title: "Quêtes de la semaine",
  resetIn: "Reset dans",
  completion: "Complétion hebdo",
  claimed: "✓ Réclamé",
  claim: (xp: number): string => `Réclamer +${String(xp)} XP`,
  reward: (xp: number): string => `+${String(xp)} XP`,
  bonusTitle: (count: number): string => `Bonus complétion · les ${String(count)} quêtes`,
  bonusFreeze: (freezes: number): string =>
    freezes > 0 ? ` + ${String(freezes)} streak-freeze` : "",
  claimedXp: (claimed: number, total: number): string =>
    `${String(claimed)}/${String(total)} XP réclamés`,
  claimedToast: (xp: number): string => `+${String(xp)} XP réclamés`,
} as const;
