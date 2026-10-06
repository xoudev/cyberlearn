"use client";

import { useParams } from "next/navigation";
import { useCallback, useRef } from "react";
import { recordExerciseAction } from "../_actions/record-exercise";

export type ExerciseKind = "TERMINAL" | "PYTHON";

/**
 * Tells the server an exercise of this lesson is done, once per exercise and
 * per page: the teacher's class view counts it, and the first time pays a
 * little XP. The lesson is read off the page's address, so a draft previewed
 * in the editor, which has no slug, records nothing. Fire and forget: nothing
 * that fails here may get in the learner's way.
 */
export function useExerciseRecord(): (exerciseId: string, kind: ExerciseKind) => void {
  const params = useParams<{ slug?: string }>();
  const slug = typeof params.slug === "string" && params.slug !== "" ? params.slug : null;
  const sent = useRef(new Set<string>());
  return useCallback(
    (exerciseId: string, kind: ExerciseKind) => {
      if (slug === null) return;
      const key = `${kind}:${exerciseId}`;
      if (sent.current.has(key)) return;
      sent.current.add(key);
      void recordExerciseAction({ slug, exerciseId, kind }).catch(() => undefined);
    },
    [slug],
  );
}
