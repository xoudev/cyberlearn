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

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(3,2,25,0.88)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Panel */}
      <div
        onClick={(e) => {
          e.stopPropagation();
        }}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(480px, calc(100vw - 32px))",
          background: "#0A0826",
          border: "1px solid #1F1B47",
          padding: "36px 32px 28px",
          animation: "modal-in 260ms cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        {/* Corner brackets */}
        <span
          style={{
            position: "absolute",
            top: -1,
            left: -1,
            width: 14,
            height: 14,
            borderTop: "2px solid #0AFFD4",
            borderLeft: "2px solid #0AFFD4",
          }}
        />
        <span
          style={{
            position: "absolute",
            top: -1,
            right: -1,
            width: 14,
            height: 14,
            borderTop: "2px solid #0AFFD4",
            borderRight: "2px solid #0AFFD4",
          }}
        />
        <span
          style={{
            position: "absolute",
            bottom: -1,
            left: -1,
            width: 14,
            height: 14,
            borderBottom: "2px solid #0AFFD4",
            borderLeft: "2px solid #0AFFD4",
          }}
        />
        <span
          style={{
            position: "absolute",
            bottom: -1,
            right: -1,
            width: 14,
            height: 14,
            borderBottom: "2px solid #0AFFD4",
            borderRight: "2px solid #0AFFD4",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#0AFFD4",
            marginBottom: 28,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#0AFFD4",
              boxShadow: "0 0 8px #0AFFD4",
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
              filter: "drop-shadow(0 0 10px #0AFFD4) drop-shadow(0 0 24px rgba(10,255,212,0.3))",
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
                  background: "linear-gradient(135deg, #0AFFD4, #0024FF)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 3,
                  left: 3,
                  right: 3,
                  bottom: 3,
                  background: "#0A0826",
                  clipPath: HEX_CLIP,
                }}
              />
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0AFFD4"
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
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#6B6890",
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
                color: "#F5F5FA",
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
            background: "rgba(10,255,212,0.04)",
            border: "1px solid rgba(10,255,212,0.12)",
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
                color: "#0AFFD4",
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
                color: "#0AFFD4",
                letterSpacing: "0.1em",
                opacity: 0.7,
              }}
            >
              XP
            </span>
          </div>

          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#6B6890",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              textAlign: "right",
            }}
          >
            <div style={{ color: "#B8B5D1", fontWeight: 600, marginBottom: 2 }}>
              LVL·{result.newLevel}
            </div>
            <div>crédités</div>
          </div>
        </div>

        {/* Level-up banner */}
        {result.leveledUp && (
          <div
            style={{
              background:
                "linear-gradient(90deg, rgba(0,36,255,0.15), rgba(10,255,212,0.12), rgba(0,36,255,0.15))",
              border: "1px solid rgba(10,255,212,0.2)",
              padding: "10px 16px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#0AFFD4",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
            Niveau {result.newLevel} atteint !
          </div>
        )}

        {/* Badges earned */}
        {hasBadges && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#6B6890",
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
                    <span style={{ color: "#F5F5FA", fontWeight: 600 }}>{badge.name}</span>
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
                      <span style={{ color: "#0AFFD4", fontSize: 10, fontWeight: 700 }}>
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
        <div style={{ height: 1, background: "#1F1B47", margin: "4px 0 20px" }} />

        {/* Footer */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "9px 18px",
              background: "transparent",
              border: "1px solid #2A2560",
              color: "#B8B5D1",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {"// fermer"}
          </button>
          <Link
            href={primaryUrl}
            onClick={onClose}
            style={{
              padding: "9px 20px",
              background: "linear-gradient(135deg, #0024FF, #0AFFD4)",
              border: "none",
              color: "#ffffff",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
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
    </div>
  );
}
