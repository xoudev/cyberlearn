"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef } from "react";
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

  // Use a ref so the callbacks below don't change when exerciseState changes.
  // Without this, every quiz answer would create a new completion object, which
  // triggers re-registration effects in Quiz/CodePlayground and causes an
  // infinite register → markDone → unregister → register loop.
  const stepperRef = useRef(stepper);
  stepperRef.current = stepper;

  const register = useCallback(
    (id: string) => {
      stepperRef.current?.registerExercise(index, id);
    },
    [index],
  );
  const unregister = useCallback(
    (id: string) => {
      stepperRef.current?.unregisterExercise(index, id);
    },
    [index],
  );
  const markDone = useCallback(
    (id: string) => {
      stepperRef.current?.markExerciseDone(index, id);
    },
    [index],
  );

  const ctx = useMemo<LessonCompletionContextType>(
    () => ({
      register,
      unregister,
      markDone,
      // getStepCompletion is read on access via the ref so these values are always
      // fresh without making the ctx object change on every exercise state update.
      get isAllComplete() {
        return stepperRef.current?.getStepCompletion(index).isAllComplete ?? true;
      },
      get pendingCount() {
        return stepperRef.current?.getStepCompletion(index).pendingCount ?? 0;
      },
    }),
    [register, unregister, markDone, index],
  );

  if (stepper !== null && stepper.currentStep !== index) return null;

  return (
    <LessonCompletionContext.Provider value={ctx}>{children}</LessonCompletionContext.Provider>
  );
}
