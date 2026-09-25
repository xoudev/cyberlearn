import React from "react";
import { RatingCard } from "@/components/rating-card";
import { fetchMyPathRating, ratePathApi } from "@/lib/api";

/**
 * The path's rating, as on the site: open once one of its lessons is
 * completed, changeable at any time, with a comment for the team. The average
 * is on the path's own header, so it is not repeated here.
 */
export function PathRatingCard({
  pathId,
  canRate,
  onRated,
}: {
  pathId: string;
  canRate: boolean;
  /** Called with the path's new average, so the screen can refresh it. */
  onRated: () => void;
}): React.JSX.Element {
  return (
    <RatingCard
      canRate={canRate}
      copy={{
        title: "Note ce parcours",
        locked: "Termine une première mission pour noter ce parcours.",
      }}
      load={async () => ({ mine: canRate ? await fetchMyPathRating(pathId) : null })}
      submit={(score, feedback) => ratePathApi(pathId, score, feedback)}
      onRated={onRated}
    />
  );
}
