import { isReadable, type LessonPlacement } from "./unlock";

/** Stable partition: keep the existing recency order within each availability group. */
export function availableFirst<L extends { id: string }>(
  lessons: readonly L[],
  placements: ReadonlyMap<string, LessonPlacement<unknown>>,
): L[] {
  const available: L[] = [];
  const locked: L[] = [];
  for (const lesson of lessons) {
    (isReadable(placements.get(lesson.id)) ? available : locked).push(lesson);
  }
  return [...available, ...locked];
}
