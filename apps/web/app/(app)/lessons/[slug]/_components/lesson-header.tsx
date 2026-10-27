import React from "react";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";
import { Crumb } from "@/components/crumb";

interface LessonHeaderProps {
  title: string;
  description: string;
  slug: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  xpReward: number;
  isCompleted: boolean;
  reviewing: boolean;
}

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
  const punctuated = /[.?!…:]$/.test(title);
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
      <p className="lesson-head__domain">Apprendre / {cat.short}</p>
      <h1 className="lesson-head__title">
        {title}
        {!punctuated && <span>.</span>}
      </h1>
      <p className="lesson-head__lede">{description}</p>
      {/* Four facts on one line, between hairlines: the duration and the XP
          as data, the difficulty, and where the reader is, marked by a
          square as well as said. */}
      <ul className="lesson-head__chips" aria-label="La leçon en bref">
        <li className="lesson-chip" data-kind="data">
          {estimatedMinutes} min
        </li>
        <li className="lesson-chip" data-kind="data">
          +{xpReward} XP
        </li>
        <li className="lesson-chip">{difficultyMeta(difficulty).label}</li>
        <li className="lesson-chip lesson-chip--status" data-completed={isCompleted}>
          <span className="lesson-chip__mark" aria-hidden="true" />
          {isCompleted ? "Terminée" : "En cours"}
        </li>
      </ul>
    </header>
  );
}
