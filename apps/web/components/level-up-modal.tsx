"use client";

import React, { useEffect } from "react";
import Link from "next/link";

/**
 * Crossing a level is celebrated when it happens on a lesson, and used to pass
 * in silence when it happened on a quest claim: creditXp wrote the "Niveau N
 * atteint" notification either way, but only the lesson flow put anything on
 * screen. A toast saying "+80 XP réclamés" is not that - it says nothing about
 * the level, which is the part worth stopping for.
 *
 * Deliberately smaller than LessonCompleteModal: there is no XP breakdown, no
 * badge list and no next lesson to offer here, and reusing that one would mean
 * feeding it a lesson result it does not have.
 */
interface Props {
  newLevel: number;
  xpGained: number;
  onClose: () => void;
}

export function LevelUpModal({ newLevel, xpGained, onClose }: Props): React.ReactElement {
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
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Niveau ${String(newLevel)} atteint`}
        onClick={(e) => {
          e.stopPropagation();
        }}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(420px, calc(100vw - 32px))",
          background: "#0A0826",
          border: "1px solid #1F1B47",
          padding: "36px 32px 28px",
          textAlign: "center",
          animation: "modal-in 260ms cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#6B6890",
            marginBottom: 18,
          }}
        >
          {"// "}
          Niveau supérieur
        </div>

        <div
          style={{
            fontFamily: "var(--font-display, sans-serif)",
            fontWeight: 800,
            fontSize: 72,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            background: "linear-gradient(135deg, #0024FF 0%, #0AFFD4 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            marginBottom: 6,
          }}
        >
          {newLevel}
        </div>

        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#0AFFD4",
            marginBottom: 24,
          }}
        >
          Niveau {newLevel} atteint
        </div>

        <div
          style={{
            fontFamily: "var(--font-body, sans-serif)",
            fontSize: 14,
            color: "#B8B5D1",
            marginBottom: 28,
            lineHeight: 1.5,
          }}
        >
          +{xpGained} XP réclamés sur ta quête hebdomadaire.
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/profile"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 38,
              padding: "0 20px",
              background: "#0024FF",
              color: "#ffffff",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              textDecoration: "none",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)",
            }}
          >
            Voir mon profil
          </Link>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 38,
              padding: "0 20px",
              background: "transparent",
              border: "1px solid #2A2560",
              color: "#B8B5D1",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Continuer
          </button>
        </div>
      </div>
    </div>
  );
}
