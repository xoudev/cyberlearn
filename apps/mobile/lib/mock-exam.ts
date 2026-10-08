import type { DomainScore } from "@cyberlearn/lib/exam/mock";

/**
 * A path's mock exam (examen blanc) as /api/mobile/mock-exam sends it: the
 * site's overview (apps/web/lib/exam/mock-exam.ts), mirrored here because the
 * app does not import the site.
 */

export interface MockHistoryItem {
  submittedAt: string;
  score: number;
  late: boolean;
  domains: DomainScore[];
}

export interface MockOverview {
  pathId: string;
  pathSlug: string;
  pathTitle: string;
  domains: { domain: string; available: number; drawn: number }[];
  questionCount: number;
  timeLimitMinutes: number;
  ready: boolean;
  running: { startedAt: string } | null;
  history: MockHistoryItem[];
}

/**
 * Whether a copy whose reply was lost went in after all: an attempt handed in
 * since this one started (the history comes newest first). Both times are the
 * server's, so the phone's clock plays no part.
 */
export function handedInSince(history: readonly MockHistoryItem[], startedAt: string): boolean {
  const newest = history[0];
  return newest !== undefined && Date.parse(newest.submittedAt) >= Date.parse(startedAt);
}

const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

/** "1 octobre": the day an attempt was handed in, as the site's history prints it. */
export function attemptDay(iso: string): string {
  return DAY.format(new Date(iso));
}
