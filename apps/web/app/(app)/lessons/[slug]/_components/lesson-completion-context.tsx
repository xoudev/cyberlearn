"use client";

import { createContext, useContext } from "react";

export interface LessonCompletionContextType {
  register: (id: string) => void;
  unregister: (id: string) => void;
  markDone: (id: string) => void;
  isAllComplete: boolean;
  pendingCount: number;
}

export const LessonCompletionContext = createContext<LessonCompletionContextType | null>(null);

export function useLessonCompletion(): LessonCompletionContextType | null {
  return useContext(LessonCompletionContext);
}
