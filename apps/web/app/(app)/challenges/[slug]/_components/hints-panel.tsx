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
      <div className="hints-head">
        <h2>Indices</h2>
        <span>
          {String(hints.length)} disponible{hints.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="hints-list">
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
              >
                <div className="hint-revealed__head">
                  <span>Indice {num} · révélé</span>
                  <span>{hint.xpCost === 0 ? "Gratuit" : `−${String(hint.xpCost)} XP`}</span>
                </div>
                <div id={contentId} className="hint-revealed__text">
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
            <div key={hint.id} className="hint-item">
              <button
                type="button"
                className="hint-row"
                disabled={!canAfford}
                aria-disabled={isPending || undefined}
                aria-busy={isPending}
                onClick={() => {
                  if (isPending) return;
                  handleReveal(hint.id);
                }}
              >
                <span className="hint-row__num">{num}</span>

                {/* Body: spans, so the row stays valid inside a button. */}
                <span className="hint-row__body">
                  <span className="hint-row__title">
                    {isPending ? "Révélation…" : `Révéler l'indice ${num}`}
                  </span>
                  <span
                    className="hint-row__cost"
                    data-cost={hint.xpCost === 0 ? "free" : canAfford ? "paid" : "short"}
                  >
                    {hint.xpCost === 0
                      ? "Gratuit"
                      : canAfford
                        ? `−${String(hint.xpCost)} XP`
                        : `XP insuffisants (${String(hint.xpCost)} requis)`}
                  </span>
                </span>

                <span className="hint-row__chev" aria-hidden="true">
                  ›
                </span>
              </button>
              {/* Outside the button, so a screen reader hears it when it lands. */}
              {errorMsg !== undefined && (
                <span role="alert" className="hint-error">
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
