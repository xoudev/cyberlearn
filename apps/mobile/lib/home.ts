import { rankFeaturedPaths, type FeaturedContext } from "@cyberlearn/lib/dashboard/featured-paths";
import { moduleRoute, type ModuleRoute } from "@cyberlearn/lib/dashboard/module-route";
import type { ModuleRef } from "@cyberlearn/lib/paths/modules";
import type { Category, Difficulty } from "./db";
import { dbTime } from "./db-time";

/**
 * The home tab around the paths, as the site's dashboard builds it: which two
 * paths lead (the shared ranking), how far into the first one the reader is,
 * and which mission comes next. The rows are the reader's own, read under RLS;
 * this only arranges them.
 */

export interface HomePathLesson {
  id: string;
  slug: string;
  title: string;
  estimatedMinutes: number;
  position: number;
  /** The module the lesson is filed under in this path; null when none. */
  moduleId: string | null;
}

export interface HomePath {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  estimatedHours: number;
  /** The reader's progress on it, or null when never started. */
  status: string | null;
  lessons: HomePathLesson[];
  /** The path's own modules, in order; empty for a path without any. */
  modules: ModuleRef[];
}

export interface LeadProgress {
  completed: number;
  total: number;
  /** The first mission not done yet, or null when every one is. */
  next: HomePathLesson | null;
}

export interface HomePaths {
  lead: HomePath | null;
  /** Its progress, only once the reader has started it: a poster otherwise. */
  leadProgress: LeadProgress | null;
  /** The lead's module in progress, drawn lesson by lesson, as the site draws it. */
  leadRoute: ModuleRoute | null;
  other: HomePath | null;
}

export function progressIn(path: HomePath, completed: ReadonlySet<string>): LeadProgress {
  const ordered = [...path.lessons].sort((a, b) => a.position - b.position);
  return {
    completed: ordered.filter((lesson) => completed.has(lesson.id)).length,
    total: ordered.length,
    next: ordered.find((lesson) => !completed.has(lesson.id)) ?? null,
  };
}

export function homePaths(
  paths: readonly HomePath[],
  completed: ReadonlySet<string>,
  context: FeaturedContext,
  /** The lesson left open, if any: the route centres on it when it is the lead's. */
  resumeId: string | null = null,
): HomePaths {
  const [lead, other] = rankFeaturedPaths(paths, context);
  if (!lead) return { lead: null, leadProgress: null, leadRoute: null, other: null };
  const progress = progressIn(lead, completed);
  const ordered = [...lead.lessons].sort((a, b) => a.position - b.position);
  return {
    lead,
    leadProgress: progress.completed > 0 ? progress : null,
    leadRoute: moduleRoute(ordered, lead.modules, completed, resumeId),
    other: other ?? null,
  };
}

/** The lead card's button, as the site words it. */
export function leadAction(progress: LeadProgress | null): string {
  if (!progress) return "Commencer le parcours";
  return progress.next ? "Reprendre le parcours" : "Terminer le parcours";
}

/** The section's title: somebody already on a path is offered to go on. */
export function pathsTitle(progress: LeadProgress | null): string {
  return progress ? "Reprends ton parcours." : "Ta prochaine mission.";
}

/** How many of the dates fall on or after `since`. */
export function countSince(values: readonly (string | null)[], since: Date): number {
  return values.filter((value) => value !== null && dbTime(value) >= since).length;
}

/** Midnight on the first of the month, local time: "ce mois-ci". */
export function monthStart(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/** The first word of a display name, for "Bonjour, Alex." */
export function firstName(displayName: string | null | undefined): string {
  const first = (displayName ?? "").trim().split(/\s+/u)[0];
  return first !== undefined && first !== "" ? first : "Opérateur";
}
