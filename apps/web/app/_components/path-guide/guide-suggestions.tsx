import React from "react";
import type { PathSuggestion } from "@cyberlearn/lib";
import type { SuggestedPath } from "@/lib/paths/suggestions";
import "./path-guide.css";

const DOMAIN: Record<string, string> = {
  DEV: "Dev",
  CYBERSEC: "Cybersec",
  NETWORK: "Réseau",
};

const LEVEL: Record<string, string> = {
  BEGINNER: "Débutant",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancé",
  EXPERT: "Expert",
};

/**
 * Two or three paths, each with the reason it was picked, and how to start
 * it. The caller decides what starting means (finishing the onboarding, or a
 * plain link), which is the only difference between the two pages that use
 * this.
 */
export function GuideSuggestions({
  suggestions,
  cta,
}: {
  suggestions: PathSuggestion<SuggestedPath>[];
  cta: (path: SuggestedPath, index: number) => React.ReactNode;
}): React.ReactElement {
  if (suggestions.length === 0) {
    return (
      <p className="pg-note">
        Aucun parcours publié ne correspond encore à ces réponses. Le catalogue complet reste
        ouvert.
      </p>
    );
  }
  return (
    <ol className="pg-suggestions" style={{ listStyle: "none", padding: 0 }}>
      {suggestions.map(({ path, reason }, i) => (
        <li key={path.slug} className="pg-suggestion">
          <div className="pg-suggestion__meta">
            {DOMAIN[path.category] ?? path.category} · {LEVEL[path.difficulty] ?? path.difficulty}
            {path.track === "CAREER" ? " · Métier" : ""} · {path.lessonCount} missions · ~
            {path.estimatedHours} h
            {path.avgRating !== null ? ` · ★ ${path.avgRating.toFixed(1).replace(".", ",")}` : ""}
          </div>
          <h3 className="pg-suggestion__title">{path.title}</h3>
          <p className="pg-suggestion__why">
            <b>Pourquoi</b>
            {reason}
          </p>
          {cta(path, i)}
        </li>
      ))}
    </ol>
  );
}
