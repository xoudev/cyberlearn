"use client";

// "use client" justified: reveal interactions, pending state per hint, local revealed content

import React, { useId, useRef, useState } from "react";
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
  const baseId = useId();
  // The hint just revealed by a press here, which takes the focus once it is
  // drawn: the button that had it is gone, and the text has to be heard.
  // Hints revealed on an earlier visit are left alone.
  const focusNext = useRef<string | null>(null);

  if (hints.length === 0) return null;

  function settle(hintId: string): void {
    setPendingIds((s) => {
      const next = new Set(s);
      next.delete(hintId);
      return next;
    });
  }

  function handleReveal(hintId: string): void {
    setPendingIds((s) => new Set([...s, hintId]));
    revealHintAction(hintId).then(
      (result) => {
        settle(hintId);
        const { error, content } = result;
        if (error !== undefined) {
          setErrors((prev) => ({ ...prev, [hintId]: error }));
        } else if (content !== undefined) {
          focusNext.current = hintId;
          setRevealed((prev) => ({ ...prev, [hintId]: content }));
          setErrors((prev) =>
            Object.fromEntries(Object.entries(prev).filter(([k]) => k !== hintId)),
          );
        }
      },
      () => {
        // A call that throws used to leave the row on "Révélation..." for
        // good, with nothing said.
        settle(hintId);
        setErrors((prev) => ({
          ...prev,
          [hintId]: "Action impossible pour l'instant. Réessaie dans un moment.",
        }));
      },
    );
  }

  return (
    <section>
      {/* Section header */}
      <div
        className="mono-label"
        style={{
          color: "var(--cosmetic-accent)",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 12,
          paddingBottom: 14,
          borderBottom: "1px dashed var(--color-border-subtle)",
          marginBottom: 20,
        }}
      >
        <span style={{ color: "var(--cosmetic-accent)" }}>{"// "}</span>
        <span>Indices</span>
        <span
          style={{
            marginLeft: "auto",
            color: "var(--color-text-muted)",
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
            const contentId = `${baseId}-${hint.id}`;
            return (
              <div
                key={hint.id}
                ref={(node) => {
                  if (node !== null && focusNext.current === hint.id) {
                    focusNext.current = null;
                    node.focus();
                  }
                }}
                // Focusable by script only, so a screen reader announces the
                // hint where the button was rather than leaving it unsaid.
                tabIndex={-1}
                role="group"
                aria-label={`Indice ${num} révélé`}
                aria-describedby={contentId}
                className="hint-revealed"
                style={{
                  display: "block",
                  borderLeft: "3px solid var(--cosmetic-accent)",
                  background: "color-mix(in srgb, var(--cosmetic-accent) 4%, transparent)",
                  border: "1px solid var(--color-border-subtle)",
                  borderLeftColor: "var(--cosmetic-accent)",
                  borderLeftWidth: 3,
                  padding: "16px 18px",
                }}
              >
                <div
                  className="mono-label"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <span style={{ color: "var(--cosmetic-accent)", fontWeight: 700 }}>
                    › Indice {num} · révélé
                  </span>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    {hint.xpCost === 0 ? "Gratuit" : `−${String(hint.xpCost)} XP`}
                  </span>
                </div>
                <div
                  id={contentId}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "var(--color-text-primary)",
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {content}
                </div>
              </div>
            );
          }

          // A real button: the row used to be a clickable <div>, out of the
          // tab order and deaf to Enter. Disabled when the XP is not there,
          // so the keyboard skips what the mouse could not do either. While
          // the call runs it is only aria-disabled: the focus is on it, and a
          // disabled button would drop it on the page.
          return (
            <div key={hint.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button
                type="button"
                className="card card--sunken hint-row"
                disabled={!canAfford}
                aria-disabled={isPending || undefined}
                aria-busy={isPending}
                onClick={() => {
                  if (isPending) return;
                  handleReveal(hint.id);
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr auto",
                  alignItems: "center",
                  gap: 14,
                  width: "100%",
                  padding: "14px 16px",
                  font: "inherit",
                  color: "inherit",
                  textAlign: "left",
                  cursor: canAfford && !isPending ? "pointer" : "not-allowed",
                  transition: "border-color 200ms ease, background 200ms ease",
                }}
              >
                {/* Number box */}
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: 12,
                    letterSpacing: "0.1em",
                    color: "var(--color-text-muted)",
                    display: "grid",
                    placeItems: "center",
                    width: 36,
                    height: 36,
                    border: "1px dashed var(--color-border-default)",
                  }}
                >
                  {num}
                </span>

                {/* Body: spans, so the row stays valid inside a button. */}
                <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span
                    className="mono-label"
                    style={{
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {isPending ? "Révélation..." : `Révéler l'indice ${num}`}
                  </span>
                  <span
                    className="mono-label"
                    style={{
                      color:
                        hint.xpCost === 0
                          ? "var(--cosmetic-accent)"
                          : canAfford
                            ? "var(--color-warning)"
                            : "var(--color-danger)",
                    }}
                  >
                    {hint.xpCost === 0
                      ? "Gratuit"
                      : canAfford
                        ? `−${String(hint.xpCost)} XP`
                        : `XP insuffisants (${String(hint.xpCost)} requis)`}
                  </span>
                </span>

                {/* Chevron */}
                <span
                  aria-hidden="true"
                  style={{
                    color: "var(--color-text-muted)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 16,
                    transition: "transform 200ms ease, color 200ms ease",
                    opacity: isPending ? 0.3 : 1,
                  }}
                >
                  ›
                </span>
              </button>
              {/* Outside the button, so a screen reader hears it when it lands. */}
              {errorMsg !== undefined && (
                <span
                  role="alert"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--color-danger)",
                  }}
                >
                  {errorMsg}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
