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
import { parsePutInOrder } from "@cyberlearn/types";

/**
 * <PutInOrder>: steps or layers shown shuffled, to put back in order. The
 * learner clicks an item to drop it in the next free position, or takes one
 * back, then asks for a check: the right positions lock, the wrong items come
 * back below. Client-side because it answers clicks; nothing is sent anywhere.
 */

const button: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid var(--color-border-default)",
  background: "transparent",
  color: "var(--color-text-primary)",
  textAlign: "left",
  fontSize: 14,
  cursor: "pointer",
};

const small: React.CSSProperties = {
  padding: "6px 12px",
  border: "1px solid var(--color-border-default)",
  background: "transparent",
  color: "var(--color-text-secondary)",
  fontFamily: MONO,
  fontSize: 12,
  cursor: "pointer",
};

export function PutInOrder(props: Record<string, unknown>): React.ReactElement {
  const parsed = parsePutInOrder(props);
  const [placed, setPlaced] = useState<Slot[] | null>(null);
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
          color: "var(--color-text-secondary)",
          fontSize: 14,
        }}
      >
        Exercice « Dans l&apos;ordre » indisponible : {parsed.problem}
      </div>
    );
  }
  const exercise = parsed.value;
  const count = exercise.items.length;
  const slots: Slot[] = placed ?? new Array<Slot>(count).fill(null);
  const order = shownOrder(count, exercise.id);
  const pool = remaining(order, slots);
  const done = locked.length === count && locked.every(Boolean);
  const complete = isComplete(slots);

  const place = (index: number): void => {
    const at = slots.indexOf(null);
    if (at === -1) return;
    const next = [...slots];
    next[at] = index;
    setPlaced(next);
  };

  const takeBack = (position: number): void => {
    if (locked[position] === true) return;
    const next = [...slots];
    next[position] = null;
    setPlaced(next);
  };

  const check = (): void => {
    const result = verdicts(slots);
    setLocked(result);
    setPlaced(keepRight(slots));
    setLastRight(result.filter(Boolean).length);
    setTries((t) => t + 1);
  };

  const restart = (): void => {
    setPlaced(null);
    setLocked([]);
    setLastRight(null);
    setTries(0);
  };

  return (
    <section
      className="card card--sunken"
      aria-label={`Dans l'ordre${exercise.title ? ` : ${exercise.title}` : ""}`}
      style={{
        margin: "28px 0",
        borderTop: `2px solid ${ACCENT}`,
      }}
    >
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--color-border-subtle)",
          display: "flex",
          gap: 10,
          alignItems: "baseline",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", color: ACCENT }}>
          DANS L&apos;ORDRE
        </span>
        {exercise.title ? (
          <span style={{ color: "var(--color-text-primary)", fontWeight: 600, fontSize: 15 }}>
            {exercise.title}
          </span>
        ) : null}
      </header>

      <div style={{ padding: "12px 16px 16px", display: "grid", gap: 12 }}>
        <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: 14 }}>
          {exercise.task}
        </p>

        <ol
          aria-label="Ta réponse"
          style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}
        >
          {slots.map((slot, position) => {
            const text = slot === null ? null : exercise.items[slot];
            const isLocked = locked[position] === true;
            return (
              <li
                key={position}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 10px",
                  border: `1px ${text === null ? "dashed" : "solid"} ${isLocked ? ACCENT : "var(--color-border-default)"}`,
                  background: isLocked
                    ? "color-mix(in srgb, var(--cosmetic-accent, var(--color-brand-turquoise)) 10%, transparent)"
                    : "transparent",
                }}
              >
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 12,
                    color: "var(--color-text-muted)",
                    width: 20,
                  }}
                >
                  {String(position + 1)}
                </span>
                {text === null ? (
                  <span style={{ color: "var(--color-text-disabled)", fontSize: 14 }}>…</span>
                ) : (
                  <>
                    <span style={{ flex: 1, color: "var(--color-text-primary)", fontSize: 14 }}>
                      {text}
                    </span>
                    {isLocked ? (
                      <span
                        aria-label="à la bonne place"
                        style={{ color: ACCENT, fontFamily: MONO }}
                      >
                        ✓
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          takeBack(position);
                        }}
                        aria-label={`Retirer : ${text ?? ""}`}
                        style={small}
                      >
                        Retirer
                      </button>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ol>

        {pool.length > 0 ? (
          <div role="group" aria-label="À placer" style={{ display: "grid", gap: 6 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--color-text-muted)" }}>
              À PLACER
            </span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {pool.map((index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    place(index);
                  }}
                  aria-label={`Placer : ${exercise.items[index] ?? ""}`}
                  style={button}
                >
                  {exercise.items[index]}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div aria-live="polite" style={{ display: "grid", gap: 8 }}>
          {lastRight !== null && !done ? (
            <p style={{ margin: 0, color: RED, fontSize: 14 }}>
              {String(lastRight)} sur {String(count)} à la bonne place. Les autres sont revenus en
              bas : replace-les.
            </p>
          ) : null}
          {tries > 0 && !done && exercise.hint ? (
            <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: 14 }}>
              Indice : {exercise.hint}
            </p>
          ) : null}
          {done ? (
            <p
              style={{
                margin: 0,
                color: "var(--color-text-secondary)",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              <strong style={{ color: ACCENT }}>Dans l&apos;ordre.</strong>
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
