import { sectionGates } from "@/lib/lessons/resume";

/**
 * Anything after the final quiz that could hold the reader: a Python
 * challenge, and a code playground (one its author marked `validate` holds its
 * section). Read off the text, so a mention in a code block counts too: the
 * cost of that mistake is only a lesson finished from "Terminer", as before.
 */
const LATER_GATE = /<(?:PythonChallenge|CodePlayground)\b/;

/**
 * The section of a lesson whose quiz finishes it, from 0, or null.
 *
 * A learner who answered the last question of a lesson's quiz still had to
 * press "Suivante", then "Terminer": the lessons put their quiz before a last
 * section, "À retenir" in 325 of them, which holds nothing to do. Answering
 * the final quiz now completes the lesson (lesson-stepper.tsx), the same
 * completion "Terminer" asks for, and the sections after it stay open to read.
 *
 * That section is the last one with a quiz, provided nothing after it holds
 * the reader: a lesson ending on a Python challenge or a playground is still
 * finished from "Terminer", once that is done. Whatever else the section
 * itself holds, besides its quizzes, is checked on the page, where the
 * section's gate knows it.
 */
export function findFinalQuizStep(sections: readonly string[]): number | null {
  const gates = sectionGates(sections);
  const step = gates.findLastIndex((gate) => gate.quizIds.length > 0);
  if (step === -1) return null;
  const later = sections.slice(step + 1);
  return later.some((section) => LATER_GATE.test(section)) ? null : step;
}
