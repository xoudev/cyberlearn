import type { ConsoleLessonOrigin } from "@cyberlearn/db";
import { isFirstCatalogueLesson } from "@cyberlearn/types";

/**
 * Which catalogue a lesson comes from, as the console's lesson lists tell it:
 * a teacher's class lesson, the first catalogue (CL-LSN-NNN) or the new one.
 *
 * The lists themselves are read a page at a time, under the filters of their
 * URL, by lessonRepository.listForConsole; the origin filter is applied there,
 * and this names each row of the page.
 */
export function lessonOrigin(
  refCode: string,
  audience: "CATALOGUE" | "CLASS",
): ConsoleLessonOrigin {
  if (audience === "CLASS") return "class";
  return isFirstCatalogueLesson(refCode) ? "first" : "new";
}
