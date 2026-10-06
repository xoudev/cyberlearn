"use client";

import { ACCENT, MONO, RED } from "@cyberlearn/ui";
import React, { useState } from "react";
import {
  isComplete,
  keepRight,
  remaining,
  shownOrder,
  type Slot,
  verdicts,
} from "@cyberlearn/lib/exercises/arrange";
import { parseMatchPairs } from "@cyberlearn/types";

/**
 * <MatchPairs>: a left column in the author's order, a right column shuffled.
 * The learner fills the current row by clicking an item of the right column,
 * empties a row by clicking what it holds, then asks for a check: the right
 * pairs lock, the wrong ones come back below. Client-side because it answers
 * clicks; nothing is sent anywhere.
 */

const button: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid #2A2560",
  background: "transparent",
  color: "#F5F5FA",
  textAlign: "left",
  fontSize: 14,
  cursor: "pointer",
};

const small: React.CSSProperties = {
  padding: "6px 12px",
  border: "1px solid #2A2560",
  background: "transparent",
  color: "#B8B5D1",
  fontFamily: MONO,
  fontSize: 12,
  cursor: "pointer",
};

export function MatchPairs(props: Record<string, unknown>): React.ReactElement {
  const parsed = parseMatchPairs(props);
  const [placed, setPlaced] = useState<Slot[] | null>(null);
  const [chosenRow, setChosenRow] = useState<number | null>(null);
  const [locked, setLocked] = useState<boolean[]>([]);
  const [lastRight, setLastRight] = useState<number | null>(null);
  const [tries, setTries] = useState(0);

  if (!parsed.ok) {
    return (
      <div
        role="note"
        style={{
          margin: "24px 0",
          padding: "14px 16px",
          border: `1px solid ${RED}`,
          color: "#B8B5D1",
          fontSize: 14,
        }}
      >
        Exercice « Associe » indisponible : {parsed.problem}
      </div>
    );
  }
  const exercise = parsed.value;
  const count = exercise.pairs.length;
  const slots: Slot[] = placed ?? new Array<Slot>(count).fill(null);
  const order = shownOrder(count, exercise.id);
  const pool = remaining(order, slots);
  const done = locked.length === count && locked.every(Boolean);
  const complete = isComplete(slots);
  // The row being filled: the one the learner chose, else the first empty one.
  const current = chosenRow !== null && slots[chosenRow] === null ? chosenRow : slots.indexOf(null);

  const fill = (index: number): void => {
    if (current === -1) return;
    const next = [...slots];
    next[current] = index;
    setPlaced(next);
    setChosenRow(null);
  };

  const empty = (row: number): void => {
    if (locked[row] === true) return;
    const next = [...slots];
    next[row] = null;
    setPlaced(next);
    setChosenRow(row);
  };

  const check = (): void => {
    const result = verdicts(slots);
    setLocked(result);
    setPlaced(keepRight(slots));
    setLastRight(result.filter(Boolean).length);
    setTries((t) => t + 1);
    setChosenRow(null);
  };

  const restart = (): void => {
    setPlaced(null);
    setChosenRow(null);
    setLocked([]);
    setLastRight(null);
    setTries(0);
  };

  return (
    <section
      className="card card--sunken"
      aria-label={`Associe${exercise.title ? ` : ${exercise.title}` : ""}`}
      style={{
        margin: "28px 0",
        borderTop: `2px solid ${ACCENT}`,
      }}
    >
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #1F1B47",
          display: "flex",
          gap: 10,
          alignItems: "baseline",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", color: ACCENT }}>
          ASSOCIE
        </span>
        {exercise.title ? (
          <span style={{ color: "#F5F5FA", fontWeight: 600, fontSize: 15 }}>{exercise.title}</span>
        ) : null}
      </header>

      <div style={{ padding: "12px 16px 16px", display: "grid", gap: 12 }}>
        <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14 }}>{exercise.task}</p>

        <ul
          aria-label="Les paires"
          style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}
        >
          {exercise.pairs.map((pair, row) => {
            const slot = slots[row] ?? null;
            const text = slot === null ? null : exercise.pairs[slot]?.right;
            const isLocked = locked[row] === true;
            const isCurrent = row === current && !done;
            return (
              <li
                key={pair.left}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 10px",
                  border: `1px solid ${isLocked ? ACCENT : isCurrent ? "#B8B5D1" : "#2A2560"}`,
                  background: isLocked
                    ? "color-mix(in srgb, var(--cosmetic-accent, #0AFFD4) 10%, transparent)"
                    : "transparent",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!isLocked) setChosenRow(row);
                  }}
                  aria-current={isCurrent ? "true" : undefined}
                  aria-label={`${pair.left}${isCurrent ? ", à remplir" : ""}`}
                  disabled={isLocked}
                  style={{
                    ...button,
                    flex: "0 0 40%",
                    border: "none",
                    padding: 0,
                    cursor: isLocked ? "default" : "pointer",
                  }}
                >
                  {pair.left}
                </button>
                <span aria-hidden="true" style={{ color: "#3F3D5C" }}>
                  →
                </span>
                {text === undefined || text === null ? (
                  <span style={{ color: "#3F3D5C", fontSize: 14 }}>…</span>
                ) : isLocked ? (
                  <span style={{ flex: 1, color: "#F5F5FA", fontSize: 14 }}>
                    {text} <span style={{ color: ACCENT, fontFamily: MONO }}>✓</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      empty(row);
                    }}
                    aria-label={`Retirer : ${text}`}
                    style={{ ...button, flex: 1, borderStyle: "dashed" }}
                  >
                    {text}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {pool.length > 0 ? (
          <div
            role="group"
            aria-label="À associer"
            style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
          >
            {pool.map((index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  fill(index);
                }}
                aria-label={`Associer : ${exercise.pairs[index]?.right ?? ""}`}
                style={button}
              >
                {exercise.pairs[index]?.right}
              </button>
            ))}
          </div>
        ) : null}

        <div aria-live="polite" style={{ display: "grid", gap: 8 }}>
          {lastRight !== null && !done ? (
            <p style={{ margin: 0, color: RED, fontSize: 14 }}>
              {String(lastRight)} sur {String(count)} associations justes. Les autres sont revenues
              en bas : réessaie.
            </p>
          ) : null}
          {tries > 0 && !done && exercise.hint ? (
            <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14 }}>Indice : {exercise.hint}</p>
          ) : null}
          {done ? (
            <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14, lineHeight: 1.6 }}>
              <strong style={{ color: ACCENT }}>Tout est associé.</strong>
              {exercise.explanation ? ` ${exercise.explanation}` : ""}
            </p>
          ) : null}
          <div style={{ display: "flex", gap: 8 }}>
            {!done ? (
              <button
                type="button"
                onClick={check}
                disabled={!complete}
                style={{
                  ...button,
                  border: `1px solid ${ACCENT}`,
                  color: ACCENT,
                  opacity: complete ? 1 : 0.5,
                  cursor: complete ? "pointer" : "default",
                }}
              >
                Vérifier
              </button>
            ) : null}
            {tries > 0 ? (
              <button type="button" onClick={restart} style={small}>
                Recommencer
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
