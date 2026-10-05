"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  type DrillQuestion,
  drawSeries,
  isRightAnswer,
  type Rng,
} from "@cyberlearn/lib/network/subnet-drill";
import { parseSubnetDrill, type SubnetDrill as Settings } from "@cyberlearn/types";

/**
 * <SubnetDrill>: IPv4 addressing questions drawn at random, a series at a
 * time, each corrected as soon as it is answered. Client-side because it draws
 * and answers; nothing is sent anywhere, it is practice, not a score.
 *
 * A typed answer gets a second try before the correction; a yes-or-no gets
 * none, the other answer being right. The correction always comes with the
 * reasoning. At the end of the series, how many were found, and a new series.
 */

const RED = "#FF4757";
const ACCENT = "var(--cosmetic-accent, #0AFFD4)";
const MONO = "var(--font-mono, monospace)";

type Outcome = "retry" | "right" | "revealed";

const field: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #2A2560",
  background: "#0A0826",
  color: "#F5F5FA",
  fontFamily: MONO,
  fontSize: 14,
};

const button: React.CSSProperties = {
  padding: "8px 14px",
  border: "1px solid #2A2560",
  background: "transparent",
  color: "#F5F5FA",
  fontSize: 14,
  cursor: "pointer",
};

const primary: React.CSSProperties = {
  ...button,
  border: `1px solid ${ACCENT}`,
  color: ACCENT,
};

const small: React.CSSProperties = {
  ...button,
  padding: "6px 12px",
  color: "#B8B5D1",
  fontFamily: MONO,
  fontSize: 12,
};

export function SubnetDrill(props: Record<string, unknown> & { rng?: Rng }): React.ReactElement {
  const { rng, ...raw } = props;
  const parsed = parseSubnetDrill(raw);
  // Read once: a lesson's props do not change, and the effect below needs
  // something stable to draw from.
  const settings = useRef<Settings | null>(parsed.ok ? parsed.value : null);
  const random = useRef<Rng>(rng ?? Math.random);
  const [series, setSeries] = useState<DrillQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [found, setFound] = useState(0);

  useEffect(() => {
    // Drawn on the client only: the server would draw another series, and the
    // page must hydrate to what it sent.
    if (settings.current !== null) setSeries(drawSeries(settings.current, random.current));
  }, []);

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
        Exercice « Calcul de sous-réseaux » indisponible : {parsed.problem}
      </div>
    );
  }
  const drill = parsed.value;
  const question = series?.[index];
  const finished = series !== null && index >= series.length;
  const answered = outcome === "right" || outcome === "revealed";

  const judge = (answer: string): void => {
    if (question === undefined || answered) return;
    if (isRightAnswer(question, answer)) {
      setOutcome("right");
      setFound((n) => n + 1);
    } else if (attempts === 0 && question.input !== "choice") {
      setAttempts(1);
      setOutcome("retry");
    } else {
      setOutcome("revealed");
    }
  };

  const next = (): void => {
    setIndex((i) => i + 1);
    setTyped("");
    setAttempts(0);
    setOutcome(null);
  };

  const restart = (): void => {
    if (settings.current !== null) setSeries(drawSeries(settings.current, random.current));
    setIndex(0);
    setTyped("");
    setAttempts(0);
    setOutcome(null);
    setFound(0);
  };

  return (
    <section
      className="card card--sunken"
      aria-label={`Calcul de sous-réseaux${drill.title ? ` : ${drill.title}` : ""}`}
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
          CALCUL DE SOUS-RÉSEAUX
        </span>
        {drill.title ? (
          <span style={{ color: "#F5F5FA", fontWeight: 600, fontSize: 15 }}>{drill.title}</span>
        ) : null}
        {series !== null && !finished ? (
          <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 12, color: "#7F7BA9" }}>
            Question {String(index + 1)} sur {String(series.length)}
          </span>
        ) : null}
      </header>

      <div style={{ padding: "12px 16px 16px", display: "grid", gap: 12 }}>
        {drill.task ? (
          <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14 }}>{drill.task}</p>
        ) : null}

        {series === null ? (
          <p style={{ margin: 0, color: "#7F7BA9", fontSize: 14 }}>Préparation des questions…</p>
        ) : null}

        {finished ? (
          <div aria-live="polite" style={{ display: "grid", gap: 10 }}>
            <p style={{ margin: 0, color: "#F5F5FA", fontSize: 15 }}>
              <strong style={{ color: ACCENT }}>Série terminée :</strong> {String(found)}{" "}
              {found > 1 ? "trouvées" : "trouvée"} sur {String(series.length)}.
            </p>
            <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14 }}>
              {found === series.length
                ? "Tout juste. Une autre série, avec d'autres adresses, pour que ça devienne un réflexe ?"
                : "Refais une série : les mêmes sortes de questions, d'autres adresses."}
            </p>
            <button type="button" onClick={restart} style={{ ...primary, justifySelf: "start" }}>
              Nouvelle série
            </button>
          </div>
        ) : null}

        {question !== undefined ? (
          <>
            <p style={{ margin: 0, color: "#F5F5FA", fontSize: 15, lineHeight: 1.5 }}>
              {question.prompt}
            </p>

            {question.input === "choice" ? (
              <div role="group" aria-label="Ta réponse" style={{ display: "flex", gap: 8 }}>
                {question.choices.map((choice) => {
                  const right = answered && choice === question.answer;
                  const picked = answered && choice === typed;
                  return (
                    <button
                      key={choice}
                      type="button"
                      disabled={answered}
                      onClick={() => {
                        setTyped(choice);
                        judge(choice);
                      }}
                      style={{
                        ...button,
                        minWidth: 90,
                        border: `1px solid ${right ? ACCENT : picked ? RED : "#2A2560"}`,
                        color: right ? ACCENT : picked ? RED : "#F5F5FA",
                        cursor: answered ? "default" : "pointer",
                      }}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  judge(typed);
                }}
                style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
              >
                <input
                  value={typed}
                  onChange={(event) => {
                    setTyped(event.target.value);
                    if (outcome === "retry") setOutcome(null);
                  }}
                  readOnly={answered}
                  aria-label="Ta réponse"
                  placeholder={question.input === "address" ? "192.168.1.0" : "62"}
                  inputMode={question.input === "address" ? "decimal" : "numeric"}
                  autoComplete="off"
                  spellCheck={false}
                  style={{ ...field, flex: "1 1 200px", minWidth: 0 }}
                />
                <button
                  type="submit"
                  disabled={answered || typed.trim() === ""}
                  style={{ ...primary, opacity: answered || typed.trim() === "" ? 0.6 : 1 }}
                >
                  Vérifier
                </button>
              </form>
            )}

            <div aria-live="polite" style={{ display: "grid", gap: 8 }}>
              {outcome === "retry" ? (
                <p style={{ margin: 0, color: RED, fontSize: 14 }}>
                  Non, ce n&apos;est pas ça : essaie encore.
                </p>
              ) : null}
              {answered ? (
                <>
                  <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14, lineHeight: 1.6 }}>
                    {outcome === "right" ? (
                      <strong style={{ color: ACCENT }}>Juste.</strong>
                    ) : (
                      <strong style={{ color: RED }}>
                        Non : la bonne réponse est {question.answer}.
                      </strong>
                    )}{" "}
                    {question.explanation}
                  </p>
                  <button type="button" onClick={next} style={{ ...small, justifySelf: "start" }}>
                    {series !== null && index + 1 < series.length
                      ? "Question suivante"
                      : "Voir le résultat"}
                  </button>
                </>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
