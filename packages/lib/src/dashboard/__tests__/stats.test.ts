import { describe, expect, it } from "vitest";
import { dashboardStats, type DashboardStatsInput } from "../stats";

const BASE: DashboardStatsInput = {
  completedThisMonth: 4,
  completedTotal: 31,
  streakDays: 6,
  longestStreak: 12,
  badgesThisMonth: 2,
  badgeTotal: 27,
  certificateCount: 1,
  certifiablePaths: 5,
};

describe("dashboardStats", () => {
  it("says what each figure counts", () => {
    expect(dashboardStats(BASE)).toEqual([
      { label: "Leçons ce mois-ci", value: 4, unit: null, detail: "31 au total", highlight: true },
      {
        label: "Streak actuel",
        value: 6,
        unit: "j",
        detail: "Record perso · 12 j",
        highlight: false,
      },
      { label: "Badges", value: 27, unit: null, detail: "+2 ce mois-ci", highlight: false },
      { label: "Certificats", value: 1, unit: null, detail: "sur 5 disponibles", highlight: false },
    ]);
  });

  it("says so when there is nothing yet, and agrees in number", () => {
    const stats = dashboardStats({
      ...BASE,
      longestStreak: 0,
      badgesThisMonth: 0,
      certifiablePaths: 1,
    });
    expect(stats.map((s) => s.detail)).toEqual([
      "31 au total",
      "Pas encore de record",
      "aucun ce mois-ci",
      "sur 1 disponible",
    ]);
  });
});
