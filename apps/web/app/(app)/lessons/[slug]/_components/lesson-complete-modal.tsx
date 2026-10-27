"use client";

// "use client" justification: the recap counts its real XP total up after it
// opens, reads the reader's motion preference, and closes on their action.
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
import { profileTabHref } from "@cyberlearn/lib/social/profile-tabs";
import { BastionLogo } from "@/components/bastion-logo";
import { LevelReached } from "@/components/level-reached";
import { LESSON_NEXT_ID } from "./next-bar-target";

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * The XP credited, counted up from zero once. With reduced motion the final
 * value shows at once: the count is a flourish, never the information.
 */
function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0 || prefersReducedMotion()) {
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

/**
 * The recap of a lesson just validated (direction artistique, section 13):
 * the XP credited on chalk, counted up once, the real score of the lesson's
 * quiz when it has one, the level and the badges earned, signed with the
 * Bastion. Its action goes on to the bar under the lesson, which names the
 * next lesson or the way back to the path with its real lock: the recap does
 * not repeat it, and finishes nothing itself.
 */
export function LessonCompleteModal({ result, lessonTitle, onClose }: Props): React.ReactElement {
  const displayXp = useCountUp(result.xpGained);
  const hasBadges = result.newBadges.length > 0;
  const quiz = result.quizScore;
  const quizShare = quiz !== null && quiz.total > 0 ? quiz.correct / quiz.total : null;

  // Closing hands the focus back to "Terminer"; the bar under the lesson is
  // where the reader goes on from, so it takes the focus once the recap is
  // gone, scrolled to without a glide when motion is reduced.
  function goOn(): void {
    onClose();
    requestAnimationFrame(() => {
      const next = document.getElementById(LESSON_NEXT_ID);
      if (next === null) return;
      next.focus({ preventScroll: true });
      next.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "center",
      });
    });
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      chrome="plain"
      className="community-dialog lesson-complete-dialog"
      maxWidth={600}
      ariaLabel={`Leçon validée : ${lessonTitle}`}
    >
      <div className="lesson-success">
        <div className="lesson-success__sheet">
          <div className="lesson-success__top">
            <p className="lesson-success__kicker">
              <span className="lesson-success__tick" aria-hidden="true">
                <svg viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 8.5l3.2 3.2L13 4.8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="square"
                  />
                </svg>
              </span>
              Leçon validée
            </p>
            <BastionLogo size={40} className="lesson-success__logo" />
          </div>
          <h2 className="lesson-success__title">{lessonTitle}</h2>
          <div className="lesson-success__tally">
            <div className="lesson-success__xp">
              <strong>+{displayXp}</strong>
              <span>XP crédités</span>
            </div>
            {/* A level reached is said under the sheet, by LevelReached. */}
            {!result.leveledUp && (
              <p className="lesson-success__level">
                <span>Niveau</span>
                <b>{levelLabel(result.newLevel)}</b>
              </p>
            )}
          </div>
        </div>

        <div className="lesson-success__report">
          {quiz !== null && (
            <div className="lesson-success__quiz">
              <div className="lesson-success__quiz-head">
                <span>Quiz de la leçon</span>
                <strong>
                  {quiz.correct}/{quiz.total} bonne{quiz.correct > 1 ? "s" : ""} réponse
                  {quiz.correct > 1 ? "s" : ""}
                </strong>
                {quizShare !== null && (
                  <span className="lesson-success__share">
                    {`${String(Math.round(quizShare * 100))}\u00a0%`}
                  </span>
                )}
              </div>
              {quiz.total > 0 && (
                <div className="lesson-success__score" aria-hidden="true">
                  {Array.from({ length: quiz.total }, (_, i) => (
                    <span key={i} data-right={i < quiz.correct} />
                  ))}
                </div>
              )}
            </div>
          )}

          {result.leveledUp && <LevelReached level={result.newLevel} size="sm" />}

          {hasBadges && (
            <section className="lesson-success__badges" aria-label="Badges débloqués">
              <h3>Badges débloqués</h3>
              <ul>
                {result.newBadges.map((badge) => {
                  const rarity = toBadgeRarity(badge.rarity);
                  return (
                    <li className="lesson-success__badge" key={badge.name}>
                      <BadgeMedallion rarity={rarity} size="xs" name={badge.name} />
                      <div>
                        <strong>{badge.name}</strong>
                        <span style={{ color: BADGE_RARITY_VAR[rarity] }}>
                          {BADGE_RARITY_LABELS[rarity]}
                        </span>
                      </div>
                      {badge.xpReward > 0 && <span>+{badge.xpReward} XP</span>}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <div className="lesson-success__actions">
          <button className="btn btn--ghost lesson-success__close" type="button" onClick={onClose}>
            Fermer
          </button>
          <Link
            className="btn btn--ghost"
            href={hasBadges ? profileTabHref("badges") : "/profile"}
            onClick={onClose}
          >
            {hasBadges ? "Voir mes badges" : "Voir mon profil"}
          </Link>
          <button className="btn lesson-success__next" type="button" onClick={goOn}>
            Voir la suite
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3 8h9.5M8.5 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="square"
              />
            </svg>
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
