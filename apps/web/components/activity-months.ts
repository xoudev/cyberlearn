export interface ActivityMonth {
  key: string;
  label: string;
  fullLabel: string;
  days: number;
}

const shortMonth = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" });
const fullMonth = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Twelve calendar months, including today but never future activity. */
export function activityMonths(
  activity: Readonly<Record<string, number>>,
  today: string,
): ActivityMonth[] {
  const end = new Date(`${today}T00:00:00Z`);
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 11 + index, 1));
    const key = date.toISOString().slice(0, 7);
    const days = Object.entries(activity).filter(
      ([day, count]) => day.startsWith(`${key}-`) && day <= today && count > 0,
    ).length;
    return { key, label: shortMonth.format(date), fullLabel: fullMonth.format(date), days };
  });
}
