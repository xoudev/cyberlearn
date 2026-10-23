import { extractLessonExercises } from "@cyberlearn/lib/mdx-exercises";
import { extractLessonQuizzes } from "@cyberlearn/lib/mdx-quizzes";

/**
 * Where a lesson not finished opens again: the section after the last one the
 * reader got through, with what they did there held as done.
 *
 * The lesson page opened every unfinished lesson on its first section, and the
 * plan shut every section ahead of the one on screen. A reader stopped at
 * section 6 came back the next day, or reloaded the page, to section 1, with
 * sections 2 to 6 grey in the plan, and had to press "Suivante" five times
 * and run again each Python challenge already passed (its success is recorded
 * on the server, and nothing read it back).
 *
 * Nothing records which section a reader was on, so it is read from what they
 * did: the answers to the section's quizzes, and the Python challenges they
 * passed. What holds a section shut is exactly that (a quiz not answered, a
 * Python challenge not passed), so a section whose gates are all open was got
 * through, and the next one is where they were. A section with no gate leaves
 * no trace, and is not counted: the reader lands after the last one that does.
 */

/** What holds the reader in a section: the quizzes to answer, the challenges to pass. */
export interface SectionGates {
  quizIds: string[];
  pythonIds: string[];
}

/** Where a lesson opens, and what is already done in it. */
export interface LessonResume {
  /** The section to open on, from 0: also the furthest the plan opens. */
  step: number;
  /** The sections got through, for the plan's marks: all those before `step`. */
  doneSteps: number[];
  /** The Python challenges already passed, by section, not to be held shut again. */
  exercisesDone: { step: number; id: string }[];
}

export const NO_RESUME: LessonResume = { step: 0, doneSteps: [], exercisesDone: [] };

/**
 * The gates of each section, read from its MDX without running any of it.
 * Only the components that hold a section shut count: a quiz, a Python
 * challenge. (A code playground does so only if its author asked for it with
 * `validate`, and nothing records it: it asks to be run again.)
 */
export function sectionGates(sections: readonly string[]): SectionGates[] {
  return sections.map((section) => ({
    quizIds: extractLessonQuizzes(section).map((quiz) => quiz.id),
    pythonIds: extractLessonExercises(section)
      .filter((exercise) => exercise.kind === "PYTHON")
      .map((exercise) => exercise.key),
  }));
}

/**
 * Where the reader was, from what they did.
 *
 * `step` is the section after the last one whose gates are all open, not
 * going past the first section that still has a closed one: that section is
 * where they stopped, or short of it. With nothing done, the first section.
 */
export function resumeLesson(
  gates: readonly SectionGates[],
  answeredQuizIds: ReadonlySet<string>,
  passedExerciseIds: ReadonlySet<string>,
): LessonResume {
  const isOpen = (g: SectionGates): boolean =>
    g.quizIds.every((id) => answeredQuizIds.has(id)) &&
    g.pythonIds.every((id) => passedExerciseIds.has(id));

  // The first section still held shut; none, when the reader got through all.
  const firstClosed = gates.findIndex((g) => !isOpen(g));
  // Where the sections got through end, and the furthest the reader can be.
  const gotThrough = firstClosed === -1 ? gates.length : firstClosed;
  const furthest = Math.max(0, firstClosed === -1 ? gates.length - 1 : firstClosed);

  // The last section got through that had something to get through.
  let lastGated = -1;
  for (let i = 0; i < gotThrough; i += 1) {
    const g = gates[i];
    if (g !== undefined && g.quizIds.length + g.pythonIds.length > 0) lastGated = i;
  }

  const step = lastGated === -1 ? 0 : Math.min(lastGated + 1, furthest);

  const exercisesDone: LessonResume["exercisesDone"] = [];
  gates.forEach((g, index) => {
    for (const id of g.pythonIds) {
      if (passedExerciseIds.has(id)) exercisesDone.push({ step: index, id });
    }
  });

  return {
    step,
    doneSteps: Array.from({ length: step }, (_unused, index) => index),
    exercisesDone,
  };
}

/**
 * The same, from a lesson's sections as written. Nothing to read when the
 * reader has done nothing yet: the lesson opens on its first section without
 * parsing a line of it.
 */
export function lessonResume(
  sections: readonly string[],
  answeredQuizIds: ReadonlySet<string>,
  passedExerciseIds: ReadonlySet<string>,
): LessonResume {
  if (answeredQuizIds.size === 0 && passedExerciseIds.size === 0) return NO_RESUME;
  return resumeLesson(sectionGates(sections), answeredQuizIds, passedExerciseIds);
}
