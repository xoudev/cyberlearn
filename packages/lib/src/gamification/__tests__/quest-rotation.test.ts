import { describe, expect, it } from "vitest";
import {
  BONUS_QUEST_TYPE,
  LESSON_QUEST_TYPE,
  pickWeekQuests,
  type RotationQuest,
  WEEK_QUEST_COUNT,
} from "../quest-rotation";

const quest = (code: string, type: string, level: number): RotationQuest => ({
  id: `id-${code}`,
  code,
  type,
  level,
});

const POOL: RotationQuest[] = [
  quest("LESSONS_2", LESSON_QUEST_TYPE, 1),
  quest("FINISH_3_LESSONS", LESSON_QUEST_TYPE, 1),
  quest("LESSONS_5", LESSON_QUEST_TYPE, 2),
  quest("PERFECT_QUIZ", "PERFECT_QUIZ", 1),
  quest("STREAK_3_DAYS", "STREAK_DAYS", 1),
  quest("STREAK_5_DAYS", "STREAK_DAYS", 2),
  quest("FORUM_WRITEUP", "FORUM_POST", 1),
  quest("CHALLENGE_1", "CHALLENGE_SOLVED", 1),
  quest("CHALLENGE_3", "CHALLENGE_SOLVED", 2),
  quest("RECALL_2", "DAILY_RECALL", 1),
  quest("RECALL_5", "DAILY_RECALL", 2),
  quest("EXERCISES_2", "EXERCISE_PASSED", 1),
  quest("EXERCISES_5", "EXERCISE_PASSED", 2),
  quest("WEEKLY_BONUS", BONUS_QUEST_TYPE, 1),
];

const WEEKS = Array.from({ length: 52 }, (_, i) => `2026-W${String(i + 1).padStart(2, "0")}`);

describe("pickWeekQuests", () => {
  it("draws four quests, the lesson quest first, never two of a kind, never the bonus", () => {
    for (const week of WEEKS) {
      const picked = pickWeekQuests(POOL, week);
      expect(picked).toHaveLength(WEEK_QUEST_COUNT);
      expect(picked[0]?.type).toBe(LESSON_QUEST_TYPE);
      expect(new Set(picked.map((q) => q.type)).size).toBe(WEEK_QUEST_COUNT);
      expect(picked.some((q) => q.type === BONUS_QUEST_TYPE)).toBe(false);
    }
  });

  it("asks for two short quests and a long one besides the lessons", () => {
    for (const week of WEEKS) {
      const levels = pickWeekQuests(POOL, week)
        .slice(1)
        .map((q) => q.level)
        .sort();
      expect(levels).toEqual([1, 1, 2]);
    }
  });

  it("is the same draw for the same week, whatever order the pool comes in", () => {
    const reversed = [...POOL].reverse();
    for (const week of WEEKS.slice(0, 8)) {
      expect(pickWeekQuests(reversed, week).map((q) => q.code)).toEqual(
        pickWeekQuests(POOL, week).map((q) => q.code),
      );
    }
  });

  it("changes from one week to the next", () => {
    const sets = new Set(
      WEEKS.map((week) =>
        pickWeekQuests(POOL, week)
          .map((q) => q.code)
          .join(),
      ),
    );
    expect(sets.size).toBeGreaterThan(20);
  });

  it("shares nothing with the week before when the pool allows it", () => {
    let previous = new Set<string>();
    for (const week of WEEKS) {
      const picked = pickWeekQuests(POOL, week, previous);
      expect(picked.filter((q) => previous.has(q.id))).toHaveLength(0);
      previous = new Set(picked.map((q) => q.id));
    }
  });

  it("makes do with a small pool", () => {
    const small = [
      quest("FINISH_3_LESSONS", LESSON_QUEST_TYPE, 1),
      quest("PERFECT_QUIZ", "PERFECT_QUIZ", 1),
      quest("STREAK_5_DAYS", "STREAK_DAYS", 2),
    ];
    expect(pickWeekQuests(small, "2026-W44").map((q) => q.code)).toEqual([
      "FINISH_3_LESSONS",
      ...pickWeekQuests(small, "2026-W44")
        .slice(1)
        .map((q) => q.code),
    ]);
    expect(pickWeekQuests(small, "2026-W44")).toHaveLength(3);
    expect(pickWeekQuests([], "2026-W44")).toEqual([]);
  });
});
