import type { LessonComponentWidth } from "@cyberlearn/lib/mdx-components";

/**
 * The box each component of a lesson sits in (lesson-mdx-components.ts).
 *
 * It is a size container (globals.css, `.lesson-block`): a component lays
 * itself out by the width it is given, not by the width of the screen. The
 * screen said nothing useful about a workshop: at 1440px it could have 1150px
 * of article or, notes docked beside it, half of that; on a tablet the same
 * component went from one column to two as the sidebar opened or closed.
 *
 * `data-width` places the box: in the prose's measure, or wide. `data-component`
 * names what is inside, for the block's spacing and for whoever reads the DOM.
 *
 * Plain data, no directive: the server builds most blocks, and the Quiz's
 * block is built on the client (quiz-block.tsx). Both read it from here, and
 * neither pulls the component registry into the browser for it.
 */

export const LESSON_BLOCK_CLASS = "lesson-block";

export interface LessonBlockAttributes {
  className: string;
  "data-width": LessonComponentWidth;
  "data-component": string;
}

export function lessonBlockAttributes(
  name: string,
  width: LessonComponentWidth,
): LessonBlockAttributes {
  return { className: LESSON_BLOCK_CLASS, "data-width": width, "data-component": name };
}
