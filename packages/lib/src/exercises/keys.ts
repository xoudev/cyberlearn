/**
 * The key an exercise of a lesson is recorded under once done, as the page
 * sends it and as the server checks it against the lesson.
 *
 * Written once, here, because the two have to agree: the page sends the key
 * of the exercise just finished, and the server pays only for a key the
 * lesson has (extractLessonExercises). This module pulls in nothing, so the
 * page can import it without the MDX parser.
 */

export type ExerciseKind = "TERMINAL" | "PYTHON";

/** The title a LinuxTerminal shows when its author gave none. */
export const LINUX_TERMINAL_DEFAULT_TITLE = "Linux · root@cyberlearn";

/** A LinuxTerminal is recorded under its id, or else its title, or else the default title. */
export function terminalExerciseKey(id: string | undefined, title: string | undefined): string {
  return id ?? title ?? LINUX_TERMINAL_DEFAULT_TITLE;
}
