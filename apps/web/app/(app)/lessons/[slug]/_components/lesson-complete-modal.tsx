"use client";

// The completion result animates its real XP total and closes on user action.
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BadgeMedallion,
  BADGE_RARITY_LABELS,
  BADGE_RARITY_VAR,
  ModalShell,
  toBadgeRarity,
} from "@cyberlearn/ui";
import type { CompleteLessonResult } from "../_actions/track-progress";
import { levelLabel } from "@cyberlearn/lib/gamification/level-label";
import { LevelReached } from "@/components/level-reached";

function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (
      target === 0 ||
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}

interface Props {
  result: CompleteLessonResult;
  lessonTitle: string;
  onClose: () => void;
}

export function LessonCompleteModal({ result, lessonTitle, onClose }: Props): React.ReactElement {
  const displayXp = useCountUp(result.xpGained);
  const hasBadges = result.newBadges.length > 0;
  return (
    <ModalShell
      open
      onClose={onClose}
      chrome="plain"
      className="community-dialog lesson-complete-dialog"
      maxWidth={520}
      ariaLabel={`Leçon validée : ${lessonTitle}`}
    >
      <div className="lesson-success">
        <p className="workspace-kicker">Leçon validée</p>
        <h2>{lessonTitle}</h2>
        <div className="lesson-success__xp">
          <div>
            <strong>+{displayXp}</strong>
            <span>XP crédités</span>
          </div>
          <span>{levelLabel(result.newLevel)}</span>
        </div>
        {result.quizScore !== null && (
          <div className="lesson-success__quiz">
            <span>Quiz de la leçon</span>
            <strong>
              {result.quizScore.correct}/{result.quizScore.total} bonne
              {result.quizScore.correct > 1 ? "s" : ""} réponse
              {result.quizScore.correct > 1 ? "s" : ""}
            </strong>
          </div>
        )}
        {result.leveledUp && <LevelReached level={result.newLevel} size="sm" />}
        {hasBadges && (
          <section className="lesson-success__badges" aria-label="Badges débloqués">
            <h3>Badges débloqués</h3>
            <div>
              {result.newBadges.map((badge) => {
                const rarity = toBadgeRarity(badge.rarity);
                return (
                  <div className="lesson-success__badge" key={badge.name}>
                    <BadgeMedallion rarity={rarity} size="xs" name={badge.name} />
                    <div>
                      <strong>{badge.name}</strong>
                      <span style={{ color: BADGE_RARITY_VAR[rarity] }}>
                        {BADGE_RARITY_LABELS[rarity]}
                      </span>
                    </div>
                    {badge.xpReward > 0 && <span>+{badge.xpReward} XP</span>}
                  </div>
                );
              })}
            </div>
          </section>
        )}
        <div className="lesson-success__actions">
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Fermer
          </button>
          <Link className="btn" href={hasBadges ? "/badges" : "/profile"} onClick={onClose}>
            {hasBadges ? "Voir mes badges" : "Voir mon profil"}
          </Link>
        </div>
      </div>
    </ModalShell>
  );
}
