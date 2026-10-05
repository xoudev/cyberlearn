import React from "react";

/**
 * "Niveau N atteint": the number, big, between its two labels.
 *
 * Shown on its own when a quest claim crosses a level, and inside the lesson
 * recap when the lesson did. Both used to draw it, differently - the recap's
 * was a thin banner, the claim's a 72px figure - for the same event, which
 * should look the same wherever it happens. The recap gets the smaller size,
 * it has an XP figure of its own above.
 */
export function LevelReached({
  level,
  size = "lg",
}: {
  level: number;
  size?: "sm" | "lg";
}): React.JSX.Element {
  return (
    <div className={`level-reached${size === "sm" ? " level-reached--sm" : ""}`}>
      <div className="level-reached__eyebrow">{"// niveau supérieur"}</div>
      <div className="level-reached__figure" aria-hidden="true">
        {level}
      </div>
      <div className="level-reached__label">Niveau {level} atteint</div>
    </div>
  );
}
