import { groupIntoModules, moduleLabel, type ModuleRef } from "../paths/modules";

/**
 * The module the reader is in, drawn as a row of lessons.
 *
 * The mission card on the dashboard shows one lesson; beside it, this says
 * where that lesson sits: the lessons of its module already done, the one
 * offered now, the ones still to come. It is the path's own data, cut to the
 * module, not a drawing of progress in general.
 */

export type RouteNodeState = "done" | "now" | "todo";

export interface RouteLesson {
  id: string;
  slug: string;
  title: string;
  /** The module the lesson is filed under in this path; null when none. */
  moduleId: string | null;
}

export interface RouteNode {
  id: string;
  slug: string;
  title: string;
  state: RouteNodeState;
}

export interface ModuleRoute {
  /** "Module 05", or "Module 05 · Le terminal" when the module is named. */
  label: string;
  /** Lessons of this module already completed. */
  done: number;
  total: number;
  nodes: RouteNode[];
}

const NONE: ReadonlySet<string> = new Set();

/**
 * Where the reader picks up a path, `lessons` in path order: the first lesson
 * neither completed nor waived by the placement test; when every lesson left
 * was waived, the first of them; null once every lesson is completed.
 *
 * A waived lesson is open, but it is a level the test said the reader already
 * has, so it is not the one offered. The path page applies the same rule on
 * the site (`resumeLesson`) and in the app (`missionStates`).
 */
export function nextLesson<L extends { id: string }>(
  lessons: readonly L[],
  completed: ReadonlySet<string>,
  waived: ReadonlySet<string> = NONE,
): L | null {
  const pending = lessons.filter((lesson) => !completed.has(lesson.id));
  return pending.find((lesson) => !waived.has(lesson.id)) ?? pending[0] ?? null;
}

/**
 * The lesson the route is centred on: `currentId` when it belongs to the
 * path, otherwise the next lesson (`nextLesson`), otherwise null (the path is
 * finished).
 */
export function currentLessonId(
  lessons: readonly RouteLesson[],
  completed: ReadonlySet<string>,
  currentId: string | null,
  waived: ReadonlySet<string> = NONE,
): string | null {
  if (currentId !== null && lessons.some((lesson) => lesson.id === currentId)) return currentId;
  return nextLesson(lessons, completed, waived)?.id ?? null;
}

/**
 * `lessons` in path order, with the path's modules (empty for a path that has
 * none: blocks of six then, as the path page draws them). A finished path
 * shows its last module, every node done. `waived` are the lessons the
 * placement test waived: the route is not centred on them, and they stay "to
 * come", since they were not done.
 */
export function moduleRoute(
  lessons: readonly RouteLesson[],
  modules: readonly ModuleRef[],
  completed: ReadonlySet<string>,
  currentId: string | null,
  waived: ReadonlySet<string> = NONE,
): ModuleRoute | null {
  if (lessons.length === 0) return null;

  const current = currentLessonId(lessons, completed, currentId, waived);
  const groups = groupIntoModules(lessons, modules);
  const index = current === null ? -1 : lessons.findIndex((lesson) => lesson.id === current);
  const group =
    index === -1 ? groups[groups.length - 1] : groups.find((g) => g.indices.includes(index));
  if (!group) return null;

  const nodes = group.indices.flatMap((i): RouteNode[] => {
    const lesson = lessons[i];
    if (!lesson) return [];
    const state: RouteNodeState =
      lesson.id === current ? "now" : completed.has(lesson.id) ? "done" : "todo";
    return [{ id: lesson.id, slug: lesson.slug, title: lesson.title, state }];
  });

  return {
    label: group.title === null ? moduleLabel(group) : `${moduleLabel(group)} · ${group.title}`,
    done: nodes.filter((node) => node.state === "done").length,
    total: nodes.length,
    nodes,
  };
}
