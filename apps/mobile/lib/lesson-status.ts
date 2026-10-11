import type { ProgressStatus } from "@/lib/db";

/**
 * The catalogue's status filter, read the way the site reads it.
 *
 * The site filters on the server (packages/db, catalogueWhere): "en cours" and
 * "terminées" are the lessons with a progress row in that status, and "non
 * commencées" the ones with no row at all. The app reads its progress first,
 * through the Data API, and turns it into a list of ids the lessons query
 * keeps, or leaves out.
 */

export type StatusFilter = ProgressStatus | "ALL";

export const STATUS_FILTER_ORDER: readonly ProgressStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
];

export const STATUS_FILTER_LABEL: Record<ProgressStatus, string> = {
  NOT_STARTED: "Non commencées",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminées",
};

export type StatusScope =
  | { kind: "all" }
  /** Only these lessons; none at all when the list is empty. */
  | { kind: "only"; ids: string[] }
  /** Every lesson but these. */
  | { kind: "except"; ids: string[] };

export function statusScope(
  status: StatusFilter,
  progress: readonly { lessonId: string; status: ProgressStatus }[],
): StatusScope {
  if (status === "ALL") return { kind: "all" };
  if (status === "NOT_STARTED") {
    return { kind: "except", ids: progress.map((row) => row.lessonId) };
  }
  return {
    kind: "only",
    ids: progress.filter((row) => row.status === status).map((row) => row.lessonId),
  };
}

/**
 * How many ids the lessons query may carry in its URL. An id takes some 40
 * characters there once encoded, so a reader who has opened most of the
 * catalogue would send a URL the API gateway refuses. Past this the scope is
 * applied to the rows instead (`inScope`).
 */
export const MAX_SCOPE_IDS_IN_URL = 150;

/** Whether the scope can go in the query's URL rather than over its rows. */
export function scopeFitsUrl(scope: StatusScope): boolean {
  return scope.kind === "all" || scope.ids.length <= MAX_SCOPE_IDS_IN_URL;
}

/** Whether a lesson is one the scope keeps. */
export function inScope(scope: StatusScope, lessonId: string): boolean {
  if (scope.kind === "all") return true;
  return scope.ids.includes(lessonId) === (scope.kind === "only");
}
