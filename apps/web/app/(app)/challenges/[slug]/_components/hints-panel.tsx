"use client";

// "use client" justified: reveal interactions, pending state per hint, local revealed content

import React, { useState } from "react";
import { revealHintAction } from "../../_actions/challenge-actions";

interface Hint {
  id: string;
  orderIndex: number;
  xpCost: number;
}

interface Props {
  hints: Hint[];
  initialRevealed: Record<string, string>; // hintId -> content
  userXp: number;
}

export function HintsPanel({ hints, initialRevealed, userXp }: Props): React.ReactElement | null {
  const [revealed, setRevealed] = useState<Record<string, string>>(initialRevealed);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set<string>());

  if (hints.length === 0) return null;

  function handleReveal(hintId: string): void {
    setPendingIds((s) => new Set([...s, hintId]));
    void revealHintAction(hintId).then((result) => {
      setPendingIds((s) => {
        const next = new Set(s);
        next.delete(hintId);
        return next;
      });
      const { error, content } = result;
      if (error !== undefined) {
        setErrors((prev) => ({ ...prev, [hintId]: error }));
      } else if (content !== undefined) {
        setRevealed((prev) => ({ ...prev, [hintId]: content }));
        setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== hintId)));
      }
    });
  }

  return (
    <section>
      {/* Section header */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--cosmetic-accent)",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 12,
          paddingBottom: 14,
          borderBottom: "1px dashed #1F1B47",
          marginBottom: 20,
        }}
      >
        <span style={{ color: "var(--cosmetic-accent)" }}>{"// "}</span>
        <span>Indices</span>
        <span
          style={{
            marginLeft: "auto",
            color: "#3F3D5C",
            fontWeight: 500,
            fontSize: 10,
            letterSpacing: "0.12em",
          }}
        >
          {String(hints.length)} disponible{hints.length > 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {hints.map((hint, idx) => {
          const content: string | undefined = revealed[hint.id];
          const isRevealed = content !== undefined;
          const isPending = pendingIds.has(hint.id);
          const canAfford = hint.xpCost === 0 || userXp >= hint.xpCost;
          const errorMsg: string | undefined = errors[hint.id];
          const num = String(idx + 1).padStart(2, "0");

          if (isRevealed) {
            return (
              <div
                key={hint.id}
                style={{
                  display: "block",
                  borderLeft: "3px solid var(--cosmetic-accent)",
                  background: "color-mix(in srgb, var(--cosmetic-accent) 4%, transparent)",
                  border: "1px solid #1F1B47",
                  borderLeftColor: "var(--cosmetic-accent)",
                  borderLeftWidth: 3,
                  padding: "16px 18px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  <span style={{ color: "var(--cosmetic-accent)", fontWeight: 700 }}>
                    › Indice {num} · révélé
                  </span>
                  <span style={{ color: "#6B6890" }}>
                    {hint.xpCost === 0 ? "Gratuit" : `−${String(hint.xpCost)} XP`}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "#F5F5FA",
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {content}
                </div>
              </div>
            );
          }

          return (
            <div
              key={hint.id}
              style={{
                display: "grid",
                gridTemplateColumns: "36px 1fr auto",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                border: "1px solid #1F1B47",
                background: "rgba(5,4,26,0.6)",
                cursor: canAfford && !isPending ? "pointer" : "default",
                transition: "border-color 200ms ease, background 200ms ease",
              }}
              onClick={() => {
                if (!isPending && canAfford) handleReveal(hint.id);
              }}
            >
              {/* Number box */}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: "0.1em",
                  color: "#6B6890",
                  display: "grid",
                  placeItems: "center",
                  width: 36,
                  height: 36,
                  border: "1px dashed #2A2560",
                }}
              >
                {num}
              </span>

              {/* Body */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 600,
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "#F5F5FA",
                  }}
                >
                  {isPending ? "Révélation..." : `Révéler l'indice ${num}`}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color:
                      hint.xpCost === 0
                        ? "var(--cosmetic-accent)"
                        : canAfford
                          ? "#FFB020"
                          : "#FF4D6D",
                  }}
                >
                  {hint.xpCost === 0
                    ? "Gratuit"
                    : canAfford
                      ? `−${String(hint.xpCost)} XP`
                      : `XP insuffisants (${String(hint.xpCost)} requis)`}
                </span>
                {errorMsg !== undefined && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#FF4D6D" }}>
                    {errorMsg}
                  </span>
                )}
              </div>

              {/* Chevron */}
              <span
                style={{
                  color: "#3F3D5C",
                  fontFamily: "var(--font-mono)",
                  fontSize: 16,
                  transition: "transform 200ms ease, color 200ms ease",
                  opacity: isPending ? 0.3 : 1,
                }}
              >
                ›
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
