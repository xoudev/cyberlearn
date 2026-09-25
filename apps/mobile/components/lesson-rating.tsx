import React from "react";
import { RatingCard } from "@/components/rating-card";
import { fetchLessonRatingApi, rateLessonApi } from "@/lib/api";

/**
 * The lesson's rating, as at the end of a lesson on the site: open once the
 * lesson is completed, changeable at any time, with its average.
 */
export function LessonRatingCard({
  lessonId,
  canRate,
}: {
  lessonId: string;
  canRate: boolean;
}): React.JSX.Element {
  return (
    <RatingCard
      canRate={canRate}
      copy={{ title: "Note cette leçon", locked: "Termine la leçon pour noter et commenter." }}
      load={() => fetchLessonRatingApi(lessonId)}
      submit={(score, feedback) => rateLessonApi(lessonId, score, feedback)}
    />
  );
}
