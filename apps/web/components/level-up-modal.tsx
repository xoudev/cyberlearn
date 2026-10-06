"use client";

import React from "react";
import Link from "next/link";
import { ModalShell } from "@/components/modal-shell";
import { LevelReached } from "@/components/level-reached";

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
  return (
    <ModalShell
      open
      onClose={onClose}
      chrome="plain"
      maxWidth={420}
      ariaLabel={`Niveau ${String(newLevel)} atteint`}
    >
      <div style={{ padding: "36px 32px 28px", textAlign: "center" }}>
        <LevelReached level={newLevel} />

        <div
          style={{
            fontFamily: "var(--font-body, sans-serif)",
            fontSize: 14,
            color: "var(--color-text-secondary)",
            marginBottom: 28,
            lineHeight: 1.5,
          }}
        >
          +{xpGained} XP réclamés sur ta quête hebdomadaire.
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="btn" href="/profile">
            Voir mon profil
          </Link>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Continuer
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
