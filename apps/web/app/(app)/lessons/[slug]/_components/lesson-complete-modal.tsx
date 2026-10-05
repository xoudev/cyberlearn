"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BadgeMedallion,
  BADGE_RARITY_LABELS,
  BADGE_RARITY_VAR,
  toBadgeRarity,
} from "@cyberlearn/ui";
import type { CompleteLessonResult } from "../_actions/track-progress";
import { levelLabel } from "@cyberlearn/lib/gamification/level-label";
import { ModalShell } from "@/components/modal-shell";
import { LevelReached } from "@/components/level-reached";
import { CornerBrackets } from "@/app/_components/corner-brackets";

// ── Design tokens ─────────────────────────────────────────────────────────────

const HEX_CLIP = "polygon(50% 0, 100% 28%, 100% 72%, 50% 100%, 0 72%, 0 28%)";

// ── XP counter hook ───────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
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

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  result: CompleteLessonResult;
  lessonTitle: string;
  onClose: () => void;
}

export function LessonCompleteModal({ result, lessonTitle, onClose }: Props): React.ReactElement {
  const displayXp = useCountUp(result.xpGained);
  const hasBadges = result.newBadges.length > 0;
  const primaryUrl = hasBadges ? "/badges" : "/profile";
  const primaryLabel = hasBadges ? "Voir mes badges" : "Voir mon profil";

  return (
    <ModalShell
      open
      onClose={onClose}
      chrome="plain"
      maxWidth={480}
      ariaLabel={`Leçon validée : ${lessonTitle}`}
    >
      <div style={{ position: "relative", padding: "36px 32px 28px" }}>
        <CornerBrackets inset={0} />

        {/* Header */}
        <div
          className="mono-label"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--cosmetic-accent)",
            marginBottom: 28,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--cosmetic-accent)",
              boxShadow: "0 0 8px var(--cosmetic-accent)",
              flexShrink: 0,
            }}
          />
          {"// mission_accomplie"}
        </div>

        {/* Hex checkmark + lesson title */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
          {/* Hex medallion */}
          <div
            style={{
              filter:
                "drop-shadow(0 0 10px var(--cosmetic-accent)) drop-shadow(0 0 24px color-mix(in srgb, var(--cosmetic-accent) 30%, transparent))",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 64,
                height: 74,
                clipPath: HEX_CLIP,
                position: "relative",
                display: "grid",
                placeItems: "center",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(135deg, var(--cosmetic-accent), var(--color-brand-blue))",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 3,
                  left: 3,
                  right: 3,
                  bottom: 3,
                  background: "var(--color-bg-elevated)",
                  clipPath: HEX_CLIP,
                }}
              />
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--cosmetic-accent)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: "relative", zIndex: 1 }}
                aria-hidden="true"
              >
                <path d="M4 12 L9 17 L20 6" />
              </svg>
            </div>
          </div>

          <div>
            <div
              className="mono-label"
              style={{
                color: "var(--color-text-muted)",
                marginBottom: 4,
              }}
            >
              {"// leçon validée"}
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: 17,
                lineHeight: 1.2,
                color: "var(--color-text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              {lessonTitle}
            </div>
          </div>
        </div>

        {/* XP display */}
        <div
          style={{
            background: "color-mix(in srgb, var(--cosmetic-accent) 4%, transparent)",
            border: "1px solid color-mix(in srgb, var(--cosmetic-accent) 12%, transparent)",
            padding: "20px 24px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 800,
                fontSize: 52,
                lineHeight: 1,
                color: "var(--cosmetic-accent)",
                animation: "xp-count-glow 1.2s ease-in-out",
                letterSpacing: "-0.02em",
              }}
            >
              +{displayXp}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 16,
                color: "var(--cosmetic-accent)",
                letterSpacing: "0.1em",
                opacity: 0.7,
              }}
            >
              XP
            </span>
          </div>

          <div
            className="mono-label"
            style={{
              color: "var(--color-text-muted)",
              textAlign: "right",
            }}
          >
            <div style={{ color: "var(--color-text-secondary)", fontWeight: 600, marginBottom: 2 }}>
              {levelLabel(result.newLevel)}
            </div>
            <div>crédités</div>
          </div>
        </div>

        {/* Quiz score: the note the catalogue will show for this lesson. */}
        {result.quizScore !== null && (
          <div
            className="mono-label card card--sunken"
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              padding: "10px 16px",
              marginBottom: 16,
              color: "var(--color-text-muted)",
            }}
          >
            <span>Quiz de la leçon</span>
            <span style={{ color: "var(--color-text-primary)", fontWeight: 700, fontSize: 14 }}>
              {result.quizScore.correct}/{result.quizScore.total}
              <span style={{ color: "var(--color-text-muted)", fontWeight: 400, fontSize: 11 }}>
                {" "}
                bonne{result.quizScore.correct > 1 ? "s" : ""} réponse
                {result.quizScore.correct > 1 ? "s" : ""}
              </span>
            </span>
          </div>
        )}

        {/* Level-up */}
        {result.leveledUp && <LevelReached level={result.newLevel} size="sm" />}

        {/* Badges earned */}
        {hasBadges && (
          <div style={{ marginBottom: 16 }}>
            <div
              className="mono-label mono-label--xs"
              style={{
                color: "var(--color-text-muted)",
                marginBottom: 8,
              }}
            >
              {"// badges débloqués"}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {result.newBadges.map((badge) => {
                const color = BADGE_RARITY_VAR[toBadgeRarity(badge.rarity)];
                const label = BADGE_RARITY_LABELS[toBadgeRarity(badge.rarity)];
                return (
                  <div
                    key={badge.name}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 10px",
                      background: `color-mix(in oklab, ${color} 6%, transparent)`,
                      border: `1px solid color-mix(in oklab, ${color} 25%, transparent)`,
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                    }}
                  >
                    <BadgeMedallion
                      rarity={toBadgeRarity(badge.rarity)}
                      size="xs"
                      name={badge.name}
                    />
                    <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
                      {badge.name}
                    </span>
                    <span
                      style={{
                        color,
                        fontSize: 9,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        opacity: 0.8,
                      }}
                    >
                      {label}
                    </span>
                    {badge.xpReward > 0 && (
                      <span
                        style={{ color: "var(--cosmetic-accent)", fontSize: 10, fontWeight: 700 }}
                      >
                        +{badge.xpReward} XP
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Separator */}
        <div
          style={{ height: 1, background: "var(--color-border-subtle)", margin: "4px 0 20px" }}
        />

        {/* Footer */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            {"// fermer"}
          </button>
          <Link
            className="mono-label"
            href={primaryUrl}
            onClick={onClose}
            style={{
              padding: "9px 20px",
              background:
                "linear-gradient(135deg, var(--color-brand-blue), var(--cosmetic-accent))",
              border: "none",
              color: "#ffffff",
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 4px 16px rgba(0,36,255,0.3)",
            }}
          >
            {primaryLabel}
            <svg
              width="10"
              height="10"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </Link>
        </div>
      </div>
    </ModalShell>
  );
}
