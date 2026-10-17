"use client";

import type { LessonComponentWidth } from "@cyberlearn/lib/mdx-components";
import React, { createContext, useContext } from "react";
import { lessonBlockAttributes } from "./lesson-block";
import { Quiz } from "./quiz";

/**
 * A lesson's Quiz in its block, or bare inside a QuizGroup.
 *
 * Every other component gets its block on the server (lesson-mdx-components.ts).
 * The Quiz cannot: a QuizGroup reads its questions' props (the id that finds
 * the answer, then the number it gives each one) and clones them. A server
 * function that wrapped the Quiz in a <div> would be rendered before the group
 * saw it, and the group would get a div with no id. This is a client
 * component, so the group receives it unrendered, props and all, and every
 * prop it is given, cloned ones included, goes on to the Quiz.
 *
 * Inside a group the questions share the group's block: the group is what sits
 * among the paragraphs, and its block is the container the questions' options
 * lay themselves out by (quiz.css).
 */

/** True under a QuizGroup; see QuizBlock. */
export const InQuizGroup = createContext(false);

type QuizBlockProps = React.ComponentProps<typeof Quiz> & {
  /** The Quiz's width in the registry, passed in by the server. */
  blockWidth: LessonComponentWidth;
};

export function QuizBlock({ blockWidth, ...props }: QuizBlockProps): React.ReactElement {
  const grouped = useContext(InQuizGroup);
  const quiz = <Quiz {...props} />;
  if (grouped) return quiz;
  return <div {...lessonBlockAttributes("Quiz", blockWidth)}>{quiz}</div>;
}
