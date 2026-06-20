// Seasonal-league shared constants + pure helpers. League divisions are distinct
// from the permanent prestige tier (palier): a user moves up/down them across
// seasons via promotion/relegation, whereas the palier only ever grows.

export type LeagueDivisionCode = "BRONZE" | "ARGENT" | "OR" | "PLATINE" | "DIAMANT";

/** Divisions ordered low → high. */
export const DIVISIONS: readonly LeagueDivisionCode[] = [
  "BRONZE",
  "ARGENT",
  "OR",
  "PLATINE",
  "DIAMANT",
];

export const DIVISION_LABEL: Record<LeagueDivisionCode, string> = {
  BRONZE: "Bronze",
  ARGENT: "Argent",
  OR: "Or",
  PLATINE: "Platine",
  DIAMANT: "Diamant",
};

/** Members per pod (the weekly competition ladder shown on the league page). */
export const POD_SIZE = 15;
/** Top N of a pod promote to the next division; bottom N relegate. */
export const PROMOTE_COUNT = 4;
export const RELEGATE_COUNT = 3;

/** The division immediately above, or null at the top. */
export function divisionUp(d: LeagueDivisionCode): LeagueDivisionCode | null {
  const i = DIVISIONS.indexOf(d);
  if (i < 0 || i >= DIVISIONS.length - 1) return null;
  return DIVISIONS[i + 1] ?? null;
}

/** The division immediately below, or null at the bottom. */
export function divisionDown(d: LeagueDivisionCode): LeagueDivisionCode | null {
  const i = DIVISIONS.indexOf(d);
  if (i <= 0) return null;
  return DIVISIONS[i - 1] ?? null;
}

/**
 * Picks the pod a newcomer joins within a division: the lowest-numbered pod that
 * still has room (< podSize), otherwise a fresh pod (max + 1). Pure - takes the
 * current per-pod member counts.
 */
export function pickPod(
  podCounts: readonly { pod: number; count: number }[],
  podSize: number = POD_SIZE,
): number {
  let maxPod = 0;
  const sorted = [...podCounts].sort((a, b) => a.pod - b.pod);
  for (const { pod, count } of sorted) {
    if (count < podSize) return pod;
    if (pod > maxPod) maxPod = pod;
  }
  return maxPod + 1;
}

/**
 * How many of a pod of `n` members promote and relegate at rollover, never
 * overlapping: the top `promote` advance and the bottom `relegate` drop, and a
 * small pod shrinks the zones (promotion wins ties for the scarce slots).
 */
export function podOutcome(
  n: number,
  promoteN: number = PROMOTE_COUNT,
  relegateN: number = RELEGATE_COUNT,
): { promote: number; relegate: number } {
  const promote = Math.max(0, Math.min(promoteN, n));
  const relegate = Math.max(0, Math.min(relegateN, n - promote));
  return { promote, relegate };
}
