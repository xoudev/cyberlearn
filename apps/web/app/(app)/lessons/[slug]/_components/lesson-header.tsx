import React from "react";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";
import { Crumb } from "@/components/crumb";

/** A tag's three colours from its one: the text, a faint fill, a firmer edge. */
function tagged(color: string): React.CSSProperties {
  return {
    color,
    background: `color-mix(in srgb, ${color} 10%, transparent)`,
    borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
  };
}

interface LessonHeaderProps {
  title: string;
  description: string;
  slug: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  xpReward: number;
  isCompleted: boolean;
  /** An administrator reading a lesson that is not published. */
  reviewing: boolean;
}

/**
 * The top of a lesson, in the column its prose is read in: where it sits in
 * the catalogue, its title, what it is about, and four facts on chips (how
 * long, how much XP, how hard, how far the reader is).
 *
 * It replaces a terminal-styled breadcrumb card, an 80px title and a "mission
 * briefing" card that said the same four facts again in large type: together
 * they pushed the first line of the lesson some 650px down the page.
 */
export function LessonHeader({
  title,
  description,
  slug,
  category,
  difficulty,
  estimatedMinutes,
  xpReward,
  isCompleted,
  reviewing,
}: LessonHeaderProps): React.ReactElement {
  const cat = categoryMeta(category);
  const diff = difficultyMeta(difficulty);

  return (
    <header className="lesson-head">
      <Crumb
        segments={[
          { label: "leçons", href: "/lessons" },
          { label: cat.slug, href: `/lessons?category=${category}` },
          slug,
        ]}
        caret={false}
      />

      {reviewing && (
        <p className="lesson-review-banner" role="status">
          <b>Aperçu administrateur.</b> Cette leçon n&apos;est pas publiée dans le catalogue : les
          apprenants ne la voient pas, et rien n&apos;est enregistré ici, ni progression ni XP.
        </p>
      )}

      <h1 className="lesson-head__title">
        <TitleWithAccent title={title} accentColor={cat.color} />
      </h1>
      <p className="lesson-head__lede">{description}</p>

      <ul className="lesson-head__chips" aria-label="La leçon en bref">
        <li className="lesson-chip" style={tagged("var(--color-text-secondary)")}>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M8 5v3.2l2 1.3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          {estimatedMinutes} min
        </li>
        <li className="lesson-chip" style={tagged("var(--cosmetic-accent)")}>
          +{xpReward} XP
        </li>
        <li className="lesson-chip" style={tagged(diff.color)}>
          <span className="lesson-chip__dot" aria-hidden="true" />
          {diff.label}
        </li>
        <li
          className="lesson-chip"
          style={tagged(isCompleted ? "var(--cosmetic-accent)" : "var(--color-rarity-legendary)")}
        >
          <span className="lesson-chip__dot lesson-chip__dot--round" aria-hidden="true" />
          {isCompleted ? "Terminée" : "En cours"}
        </li>
      </ul>
    </header>
  );
}

/** The title, its last meaningful word lit in the category's colour. */
function TitleWithAccent({
  title,
  accentColor,
}: {
  title: string;
  accentColor: string;
}): React.ReactElement {
  const words = title.split(" ");
  const accent: React.CSSProperties = {
    fontStyle: "normal",
    background: `linear-gradient(135deg, ${accentColor} 0%, var(--cosmetic-accent) 100%)`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  };
  if (words.length <= 2) {
    return (
      <>
        {words.slice(0, -1).join(" ")} <em style={accent}>{words[words.length - 1]}.</em>
      </>
    );
  }

  const skip = new Set([
    "les",
    "des",
    "une",
    "aux",
    "par",
    "sur",
    "sous",
    "avec",
    "pour",
    "dans",
    "que",
    "qui",
  ]);
  let accentIdx = words.length - 1;
  for (let i = words.length - 1; i >= 0; i--) {
    const w = (words[i] ?? "").toLowerCase().replace(/[^a-zàâéèêîôùû]/g, "");
    if (w.length >= 4 && !skip.has(w)) {
      accentIdx = i;
      break;
    }
  }

  return (
    <>
      {words.slice(0, accentIdx).join(" ")}{" "}
      <em style={accent}>{words.slice(accentIdx).join(" ")}.</em>
    </>
  );
}
