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

/** "07:42": what is left, minutes and seconds. */
export function clockText(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
