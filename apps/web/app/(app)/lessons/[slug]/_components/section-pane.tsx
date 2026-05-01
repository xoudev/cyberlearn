"use client";

import React, { createContext, useCallback, useContext, useMemo } from "react";
import {
  LessonCompletionContext,
  type LessonCompletionContextType,
} from "./lesson-completion-context";

// ── Stepper context ────────────────────────────────────────────────────────────

export interface StepperContextType {
  currentStep: number;
  registerExercise: (step: number, id: string) => void;
  unregisterExercise: (step: number, id: string) => void;
  markExerciseDone: (step: number, id: string) => void;
  getStepCompletion: (step: number) => { isAllComplete: boolean; pendingCount: number };
}

export const StepperContext = createContext<StepperContextType | null>(null);

// ── SectionPane ────────────────────────────────────────────────────────────────
// Conditionally renders its section based on currentStep.
// Provides a scoped LessonCompletionContext backed by the stepper's global exercise state.

export function SectionPane({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}): React.ReactElement | null {
  const stepper = useContext(StepperContext);

  const register = useCallback(
    (id: string) => {
      stepper?.registerExercise(index, id);
    },
    [stepper, index],
  );
  const unregister = useCallback(
    (id: string) => {
      stepper?.unregisterExercise(index, id);
    },
    [stepper, index],
  );
  const markDone = useCallback(
    (id: string) => {
      stepper?.markExerciseDone(index, id);
    },
    [stepper, index],
  );

  const stepComp = stepper?.getStepCompletion(index) ?? { isAllComplete: true, pendingCount: 0 };

  const ctx = useMemo<LessonCompletionContextType>(
    () => ({
      register,
      unregister,
      markDone,
      isAllComplete: stepComp.isAllComplete,
      pendingCount: stepComp.pendingCount,
    }),
    [register, unregister, markDone, stepComp.isAllComplete, stepComp.pendingCount],
  );

  if (stepper !== null && stepper.currentStep !== index) return null;

  return (
    <LessonCompletionContext.Provider value={ctx}>{children}</LessonCompletionContext.Provider>
  );
}
