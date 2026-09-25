import { describe, expect, it } from "vitest";
import {
  QUEST_COPY,
  fmtWeekReset,
  questProgressPct,
  questState,
  splitWeekQuests,
  weekCompletion,
  type WeekQuestView,
} from "./weekly-quests.js";

function quest(over: Partial<WeekQuestView>): WeekQuestView {
  return {
    id: "q",
    title: "Terminer 3 leçons",
    type: "LESSON_COMPLETED",
    target: 3,
    xpReward: 50,
    freezeReward: 0,
    progress: 0,
    completed: false,
    claimed: false,
    ...over,
  };
}

describe("a week of quests", () => {
  it("says where each quest stands", () => {
    expect(questState(quest({}))).toBe("running");
    expect(questState(quest({ completed: true }))).toBe("claimable");
    expect(questState(quest({ completed: true, claimed: true }))).toBe("claimed");
  });

  it("measures progress without passing 100", () => {
    expect(questProgressPct(quest({ progress: 1 }))).toBe(33);
    expect(questProgressPct(quest({ progress: 5 }))).toBe(100);
    expect(questProgressPct(quest({ target: 0 }))).toBe(0);
  });

  it("keeps the completion bonus apart from the quests to do", () => {
    const list = [
      quest({ id: "a" }),
      quest({ id: "bonus", type: "WEEKLY_BONUS" }),
      quest({ id: "b", type: "FORUM_POST" }),
    ];
    const { main, bonus } = splitWeekQuests(list);
    expect(main.map((q) => q.id)).toEqual(["a", "b"]);
    expect(bonus?.id).toBe("bonus");
    expect(splitWeekQuests([quest({})]).bonus).toBeNull();
  });

  it("counts the week by what was claimed, as the dashboard does", () => {
    const main = [
      quest({ claimed: true, completed: true, xpReward: 50 }),
      quest({ completed: true, xpReward: 30 }),
      quest({ xpReward: 20 }),
      quest({ xpReward: 100 }),
    ];
    expect(weekCompletion(main)).toEqual({
      claimedCount: 1,
      total: 4,
      pct: 25,
      claimedXp: 50,
      totalXp: 200,
    });
    expect(weekCompletion([]).pct).toBe(0);
  });

  it("counts down to the reset in days, hours and minutes", () => {
    expect(fmtWeekReset(((2 * 24 + 5) * 60 + 12) * 60_000 + 59_000)).toBe("2j 5h 12m");
    expect(fmtWeekReset(-1)).toBe("0j 0h 0m");
  });

  it("words the rewards the way the site does", () => {
    expect(QUEST_COPY.claim(50)).toBe("Réclamer +50 XP");
    expect(QUEST_COPY.bonusTitle(4)).toBe("Bonus complétion · les 4 quêtes");
    expect(QUEST_COPY.bonusFreeze(1)).toBe(" + 1 streak-freeze");
    expect(QUEST_COPY.bonusFreeze(0)).toBe("");
    expect(QUEST_COPY.claimedXp(50, 200)).toBe("50/200 XP réclamés");
  });
});
