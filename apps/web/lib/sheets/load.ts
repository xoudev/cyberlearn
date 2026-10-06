import { lessonRepository, pathRepository } from "@cyberlearn/db";
import { groupIntoModules } from "@cyberlearn/lib/paths/modules";
import { buildSheet, type RevisionSheet } from "@cyberlearn/lib/paths/sheet";

/**
 * The revision sheet of one module of a path, for the reader who asks: the
 * path as that reader may open it (a class's path stays its class's), the
 * module as the path page cuts them (its own modules, or blocks of six), the
 * lessons' recaps in the path's order. Null when the path or the module is
 * not there for this reader. The site's PDF route and the app's JSON route
 * both read this, so the two sheets are one.
 */
export async function loadSheet(
  slug: string,
  viewerId: string,
  moduleNumber: number,
): Promise<RevisionSheet | null> {
  const path = await pathRepository.findSheetOutline(slug, viewerId);
  if (!path) return null;
  const group = groupIntoModules(path.lessons, path.modules).find(
    (candidate) => candidate.number === moduleNumber,
  );
  if (!group) return null;
  const ids = group.indices
    .map((index) => path.lessons[index]?.lessonId)
    .filter((id): id is string => id !== undefined);
  const sources = await lessonRepository.findRecapSources(ids);
  const byId = new Map(sources.map((source) => [source.id, source]));
  const lessons = ids
    .map((id) => byId.get(id))
    .filter((source): source is NonNullable<typeof source> => source !== undefined);
  return buildSheet({
    pathTitle: path.title,
    moduleNumber,
    moduleTitle: group.title,
    lessons,
  });
}
