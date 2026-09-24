/**
 * The home page's four figures, and what each of them is actually counting.
 *
 * They once said "Ce mois-ci" over numbers that were nothing of the sort: the
 * lessons figure was the all-time total with "+N au total" underneath it as if
 * it were a gain, the badges figure counted the three on the shelf rather than
 * the collection, the streak's second line was the word "Continuez !", and the
 * certificates cell was a hard-coded 0 out of a hard-coded 4 on every account.
 * Written once here, so the site and the app say the same thing.
 */

export interface DashboardStatsInput {
  completedThisMonth: number;
  completedTotal: number;
  streakDays: number;
  longestStreak: number;
  badgesThisMonth: number;
  badgeTotal: number;
  certificateCount: number;
  /** The catalogue's paths: the ones that issue certificates. */
  certifiablePaths: number;
}

export interface DashboardStat {
  label: string;
  value: number;
  unit: string | null;
  detail: string;
  /** The one figure drawn larger: this month's lessons. */
  highlight: boolean;
}

export function dashboardStats(input: DashboardStatsInput): DashboardStat[] {
  return [
    {
      label: "Leçons ce mois-ci",
      value: input.completedThisMonth,
      unit: null,
      detail: `${String(input.completedTotal)} au total`,
      highlight: true,
    },
    {
      label: "Streak actuel",
      value: input.streakDays,
      unit: "j",
      detail:
        input.longestStreak > 0
          ? `Record perso · ${String(input.longestStreak)} j`
          : "Pas encore de record",
      highlight: false,
    },
    {
      label: "Badges",
      value: input.badgeTotal,
      unit: null,
      detail:
        input.badgesThisMonth > 0
          ? `+${String(input.badgesThisMonth)} ce mois-ci`
          : "aucun ce mois-ci",
      highlight: false,
    },
    {
      label: "Certificats",
      value: input.certificateCount,
      unit: null,
      detail: `sur ${String(input.certifiablePaths)} disponible${input.certifiablePaths > 1 ? "s" : ""}`,
      highlight: false,
    },
  ];
}
