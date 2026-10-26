import { consoleDateFormat } from "@/lib/console-time";

/** A day as the account lists print it: "12 oct. 2026", in Paris. */
export function formatDay(d: Date): string {
  return consoleDateFormat({
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** "aujourd'hui", "hier", "il y a 3 j", then the day itself. */
export function relativeDay(d: Date, now: number = Date.now()): string {
  const diffDays = Math.floor((now - d.getTime()) / 86_400_000);
  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return "hier";
  if (diffDays < 7) return `il y a ${String(diffDays)} j`;
  return formatDay(d);
}
