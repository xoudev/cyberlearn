import { describe, expect, it } from "vitest";
import { QUEST_COPY, claimFeedback, splitWeekQuests, weekCompletion } from "../quests";

describe("the week's quests in the app", () => {
  it("says what a claim gained, as the site's toast does", () => {
    expect(claimFeedback({ ok: true, xpGained: 75 }, 50)).toEqual({
      tone: "success",
      text: "+75 XP réclamés",
    });
    expect(claimFeedback({ ok: true }, 50).text).toBe("+50 XP réclamés");
  });

  it("passes the server's refusal on, with a fallback", () => {
    expect(claimFeedback({ ok: false, error: "Récompense déjà réclamée." }, 50)).toEqual({
      tone: "error",
      text: "Récompense déjà réclamée.",
    });
    expect(claimFeedback({ ok: false }, 50).text).toBe("Réclamation impossible.");
  });

  it("reads the week with the site's rules", () => {
    const { main, bonus } = splitWeekQuests([
      { type: "LESSON_COMPLETED", claimed: true, xpReward: 50 },
      { type: "WEEKLY_BONUS", claimed: false, xpReward: 100 },
      { type: "FORUM_POST", claimed: false, xpReward: 30 },
    ]);
    expect(bonus?.xpReward).toBe(100);
    expect(weekCompletion(main)).toMatchObject({ claimedCount: 1, total: 2, pct: 50 });
    expect(QUEST_COPY.title).toBe("Quêtes de la semaine");
  });
});
