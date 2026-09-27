/**
 * How a path's lessons are shown in modules.
 *
 * A path used to be one list, cut on screen into blocks of six labelled
 * "Module 01", "Module 02": a drawing, not a structure. The new catalogue has
 * paths of eighty lessons written module by module, each module with its own
 * title, so a path can now carry real modules (public.path_modules) and a
 * lesson says which one it belongs to.
 *
 * This turns the two into what the site and the app draw. It never reorders:
 * the order of study, and so what unlocks what, stays the lessons' position in
 * the path. A module only says where one group ends and the next begins.
 *
 * Pure and dependency-free, so the site and the mobile app group the same way.
 */

export interface ModuleRef {
  id: string;
  position: number;
  title: string;
  description?: string | null;
}

export interface ModuleGroup {
  /** Stable key for rendering: the module id, or a label for the fallbacks. */
  key: string;
  /** 1-based, as shown: "Module 03". */
  number: number;
  /** The module's own title; null for a path that has none. */
  title: string | null;
  description: string | null;
  /** Indexes into the lessons array given, in that array's order. */
  indices: number[];
}

/** How many lessons a block holds when the path has no modules of its own. */
export const FALLBACK_MODULE_SIZE = 6;

/**
 * Groups `lessons`, already in path order, by module.
 *
 * - No modules: blocks of FALLBACK_MODULE_SIZE, untitled - what every path
 *   showed until now.
 * - Modules: one group per module that has lessons, in module order, each
 *   holding its lessons in path order. A lesson whose module is unknown (not
 *   filed yet, or filed under a module of another path) lands in a last,
 *   untitled group rather than disappearing.
 */
export function groupIntoModules(
  lessons: readonly { moduleId: string | null }[],
  modules: readonly ModuleRef[],
): ModuleGroup[] {
  if (modules.length === 0) {
    const groups: ModuleGroup[] = [];
    for (let start = 0; start < lessons.length; start += FALLBACK_MODULE_SIZE) {
      const indices: number[] = [];
      for (let i = start; i < Math.min(start + FALLBACK_MODULE_SIZE, lessons.length); i++) {
        indices.push(i);
      }
      groups.push({
        key: `block-${String(groups.length + 1)}`,
        number: groups.length + 1,
        title: null,
        description: null,
        indices,
      });
    }
    return groups;
  }

  const ordered = [...modules].sort((a, b) => a.position - b.position);
  const byModule = new Map<string, number[]>(ordered.map((m) => [m.id, []]));
  const loose: number[] = [];
  lessons.forEach((lesson, index) => {
    const bucket = lesson.moduleId === null ? undefined : byModule.get(lesson.moduleId);
    if (bucket) bucket.push(index);
    else loose.push(index);
  });

  const groups: ModuleGroup[] = [];
  for (const module of ordered) {
    const indices = byModule.get(module.id) ?? [];
    if (indices.length === 0) continue;
    groups.push({
      key: module.id,
      number: groups.length + 1,
      title: module.title,
      description: module.description ?? null,
      indices,
    });
  }
  if (loose.length > 0) {
    groups.push({
      key: "loose",
      number: groups.length + 1,
      title: null,
      description: null,
      indices: loose,
    });
  }
  return groups;
}

/** "Module 03", as the path page and the app label a group. */
export function moduleLabel(group: Pick<ModuleGroup, "number">): string {
  return `Module ${String(group.number).padStart(2, "0")}`;
}
