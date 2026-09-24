"use client";

import React from "react";
import { LessonRating, type RatingCopy } from "../../../lessons/[slug]/_components/lesson-rating";
import { ratePathAction } from "../_actions/rate-path";

const PATH_COPY: RatingCopy = {
  title: "Note ce parcours",
  locked: "Termine une première mission pour noter ce parcours",
  railLocked: "Termine une première mission pour noter ce parcours.",
  placeholder:
    "Un mot pour l'équipe : ce qui manque, ce qui est de trop (facultatif, 500 car. max)",
};

/**
 * The path's rating, with the same widget as a lesson's.
 *
 * Open once one lesson of the path is completed rather than at its end: a
 * path is long, and the learners who stop halfway are the opinion most worth
 * having. The note can be changed as the path goes on.
 */
export function PathRating({
  pathId,
  canRate,
  initialScore,
  initialFeedback,
  avgRating,
  ratingsCount,
}: {
  pathId: string;
  canRate: boolean;
  initialScore: number | null;
  initialFeedback: string | null;
  avgRating: number | null;
  ratingsCount: number;
}): React.ReactElement {
  return (
    <LessonRating
      lessonId={pathId}
      isCompleted={canRate}
      initialScore={initialScore}
      initialFeedback={initialFeedback}
      avgRating={avgRating}
      ratingsCount={ratingsCount}
      copy={PATH_COPY}
      submit={async (score, feedback) => {
        const result = await ratePathAction(pathId, score, feedback);
        return result.ok
          ? {
              success: true,
              avgRating: result.avgRating ?? undefined,
              ratingsCount: result.ratingsCount,
            }
          : { success: false, error: result.error };
      }}
    />
  );
}
