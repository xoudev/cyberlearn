"use client";

import { createContext } from "react";

/**
 * True under a QuizGroup. A Quiz in a group shares the group's block
 * (quiz-block.tsx), and leaves its section's gate to the group, which asks one
 * question at a time and holds the section for those not on screen as well
 * (quiz-group.tsx). On its own module so that the Quiz, the block and the
 * group all read it without importing one another.
 */
export const InQuizGroup = createContext(false);
