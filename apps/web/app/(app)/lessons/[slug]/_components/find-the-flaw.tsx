"use client";

import { RED } from "@cyberlearn/ui";
import React, { useState } from "react";
import { flawLines, parseFindTheFlaw } from "@cyberlearn/types";

/**
 * <FindTheFlaw>: a piece of code, a vulnerable line to click, then the name of
 * the flaw to pick. Client-side because it answers clicks; nothing is sent
 * anywhere, it is practice, not a score.
 *
 * Two steps, each retried until right: the line first (a hint after the second
 * wrong one, when the author wrote one), then the name. The explanation comes
 * with the right name. "Recommencer" starts over.
 */

type Stage = "line" | "name" | "done";

export function FindTheFlaw(props: Record<string, unknown>): React.ReactElement {
  const parsed = parseFindTheFlaw(props);
  const [stage, setStage] = useState<Stage>("line");
  const [wrongLines, setWrongLines] = useState<number[]>([]);
  const [wrongOptions, setWrongOptions] = useState<number[]>([]);

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
        Exercice « Trouve la faille » indisponible : {parsed.problem}
      </div>
    );
  }

  const flaw = parsed.flaw;
  const lines = flawLines(flaw.code);
  const width = String(lines.length).length;

  const pickLine = (n: number): void => {
    if (stage !== "line") return;
    if (n === flaw.line) setStage("name");
    else if (!wrongLines.includes(n)) setWrongLines([...wrongLines, n]);
  };
  const pickOption = (i: number): void => {
    if (stage !== "name") return;
    if (i === flaw.correct) setStage("done");
    else if (!wrongOptions.includes(i)) setWrongOptions([...wrongOptions, i]);
  };
  const restart = (): void => {
    setStage("line");
    setWrongLines([]);
    setWrongOptions([]);
  };

  const accent = "var(--cosmetic-accent, var(--color-brand-turquoise))";
  const found = stage !== "line";

  return (
    <section
      className="card card--sunken"
      aria-label={`Trouve la faille${flaw.title ? ` : ${flaw.title}` : ""}`}
      style={{
        margin: "28px 0",
        borderTop: `2px solid ${accent}`,
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
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 10,
            letterSpacing: "0.16em",
            color: accent,
          }}
        >
          TROUVE LA FAILLE
        </span>
        {flaw.title ? (
          <span style={{ color: "var(--color-text-primary)", fontWeight: 600, fontSize: 15 }}>
            {flaw.title}
          </span>
        ) : null}
      </header>

      <p
        style={{
          margin: 0,
          padding: "12px 16px 0",
          color: "var(--color-text-secondary)",
          fontSize: 14,
        }}
      >
        {stage === "line"
          ? "Clique sur la ligne vulnérable."
          : "Ligne trouvée. Quelle est cette faille ?"}
      </p>

      <ol
        className="card card--sunken"
        aria-label={`Code ${flaw.language}`}
        style={{
          listStyle: "none",
          margin: "12px 16px",
          padding: "8px 0",
          overflowX: "auto",
        }}
      >
        {lines.map((text, i) => {
          const n = i + 1;
          const isFlaw = found && n === flaw.line;
          const isWrong = wrongLines.includes(n);
          const blank = text.trim() === "";
          return (
            <li key={n}>
              <button
                type="button"
                onClick={() => {
                  pickLine(n);
                }}
                disabled={blank || stage !== "line"}
                // The number and the code, read together; then what was decided.
                aria-label={`Ligne ${String(n)} : ${text.trim()}${isWrong ? ", pas celle-ci" : ""}${isFlaw ? ", la ligne vulnérable" : ""}`}
                style={{
                  display: "flex",
                  gap: 14,
                  width: "100%",
                  minWidth: "max-content",
                  padding: "1px 12px",
                  border: "none",
                  borderLeft: `3px solid ${isFlaw ? accent : isWrong ? RED : "transparent"}`,
                  background: isFlaw
                    ? "color-mix(in srgb, var(--cosmetic-accent, var(--color-brand-turquoise)) 12%, transparent)"
                    : isWrong
                      ? "rgba(255, 71, 87, 0.10)"
                      : "transparent",
                  color: "var(--color-text-secondary)",
                  textAlign: "left",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 13,
                  lineHeight: 1.7,
                  whiteSpace: "pre",
                  cursor: blank || stage !== "line" ? "default" : "pointer",
                }}
                className="find-the-flaw__line"
              >
                <span
                  aria-hidden="true"
                  style={{ color: "var(--color-text-disabled)", userSelect: "none" }}
                >
                  {String(n).padStart(width, " ")}
                </span>
                <span>{text}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div aria-live="polite" style={{ padding: "0 16px 16px", display: "grid", gap: 10 }}>
        {stage === "line" && wrongLines.length > 0 ? (
          <p style={{ margin: 0, color: RED, fontSize: 14 }}>
            Pas celle-ci : relis ce que fait chaque ligne avec ce qui vient de l&apos;extérieur.
          </p>
        ) : null}
        {stage === "line" && wrongLines.length >= 2 && flaw.hint ? (
          <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: 14 }}>
            Indice : {flaw.hint}
          </p>
        ) : null}

        {found ? (
          <div role="group" aria-label="Nom de la faille" style={{ display: "grid", gap: 8 }}>
            {flaw.options.map((option, i) => {
              const right = stage === "done" && i === flaw.correct;
              const wrong = wrongOptions.includes(i);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    pickOption(i);
                  }}
                  disabled={stage === "done" || wrong}
                  style={{
                    padding: "10px 14px",
                    border: `1px solid ${right ? accent : wrong ? RED : "var(--color-border-default)"}`,
                    background: right
                      ? "color-mix(in srgb, var(--cosmetic-accent, var(--color-brand-turquoise)) 10%, transparent)"
                      : "transparent",
                    color: wrong ? "var(--color-text-muted)" : "var(--color-text-primary)",
                    textAlign: "left",
                    fontSize: 14,
                    cursor: stage === "done" || wrong ? "default" : "pointer",
                  }}
                >
                  {option}
                  {wrong ? " : non" : ""}
                </button>
              );
            })}
          </div>
        ) : null}

        {stage === "done" ? (
          <>
            <p
              style={{
                margin: 0,
                color: "var(--color-text-secondary)",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              <strong style={{ color: accent }}>Trouvé.</strong> {flaw.explanation}
            </p>
            <button
              className="btn btn--ghost btn--sm"
              type="button"
              onClick={restart}
              style={{
                justifySelf: "start",
              }}
            >
              Recommencer
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
