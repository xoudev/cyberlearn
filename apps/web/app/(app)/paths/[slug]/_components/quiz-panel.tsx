"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";
import {
  type StartQuizResult,
  type SubmitQuizResult,
  startQuizAttempt,
  submitQuizAttempt,
} from "../_actions/quiz-actions";

type Question = NonNullable<StartQuizResult["questions"]>[number];
type ResultItem = NonNullable<SubmitQuizResult["results"]>[number];

interface QuizPanelProps {
  pathId: string;
  /** An active quiz exists for this path. When false, the panel renders nothing. */
  hasQuiz: boolean;
  /** All lessons of the path are complete (server-derived). */
  lessonsComplete: boolean;
  /** Path already COMPLETED (quiz already passed). */
  pathCompleted: boolean;
}

const TEAL = "#0AFFD4";
const RED = "#FF4757";
const BLUE = "#6E8BFF";

const card: React.CSSProperties = {
  position: "relative",
  padding: "22px 22px 24px",
  background: "rgba(5,4,26,0.55)",
  border: "1px solid #1F1B47",
};
const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: TEAL,
  marginBottom: 10,
};
const mono = (color: string, size = 12): React.CSSProperties => ({
  fontFamily: "var(--font-mono)",
  fontSize: size,
  color,
  letterSpacing: "0.03em",
  lineHeight: 1.6,
});

function PrimaryButton({
  children,
  onClick,
  disabled,
  tone = TEAL,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: string;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        marginTop: 14,
        width: "100%",
        height: 44,
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        color: "#05041A",
        background: tone,
        border: "none",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

export function QuizPanel({
  pathId,
  hasQuiz,
  lessonsComplete,
  pathCompleted,
}: QuizPanelProps): React.ReactElement | null {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [phase, setPhase] = useState<"intro" | "taking" | "results">("intro");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitQuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmUnanswered, setConfirmUnanswered] = useState(false);

  if (!hasQuiz) return null;

  function start(): void {
    setError(null);
    startTransition(async () => {
      const res = await startQuizAttempt(pathId);
      if (!res.ok || !res.attemptId || !res.questions) {
        setError(res.error ?? "Impossible de démarrer le quiz.");
        return;
      }
      setAttemptId(res.attemptId);
      setQuestions(res.questions);
      setAnswers({});
      setConfirmUnanswered(false);
      setPhase("taking");
    });
  }

  function submit(): void {
    if (!attemptId) return;
    const unanswered = questions.length - Object.keys(answers).length;
    if (unanswered > 0 && !confirmUnanswered) {
      setConfirmUnanswered(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await submitQuizAttempt(attemptId, answers);
      if (!res.ok) {
        setError(res.error ?? "Soumission impossible.");
        return;
      }
      setResult(res);
      setPhase("results");
      if (res.passed) router.refresh(); // cert is emitted server-side → refresh cert card
    });
  }

  function retry(): void {
    setPhase("intro");
    setResult(null);
    setError(null);
  }

  // ── Results ────────────────────────────────────────────────────────────────
  if (phase === "results" && result) {
    const passed = result.passed === true;
    return (
      <div style={card}>
        <div style={{ ...eyebrow, color: passed ? TEAL : RED }}>
          {`// Quiz final · ${passed ? "réussi" : "échoué"}`}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: 40,
              color: passed ? TEAL : RED,
              lineHeight: 1,
            }}
          >
            {result.score}%
          </span>
          <span style={mono(passed ? TEAL : RED)}>{passed ? "✓ Validé" : "✗ Non validé"}</span>
        </div>

        <ResultsList items={result.results ?? []} />

        {passed ? (
          <Link
            href="/certifs"
            className="link-action"
            style={{
              ...mono(TEAL),
              display: "inline-block",
              marginTop: 14,
              textDecoration: "none",
            }}
          >
            Certificat émis → voir mes certificats
          </Link>
        ) : (
          <PrimaryButton onClick={retry} tone={BLUE}>
            Réessayer (cooldown 30 min)
          </PrimaryButton>
        )}
        {error && <p style={{ ...mono(RED), marginTop: 10 }}>{error}</p>}
      </div>
    );
  }

  // ── Taking ───────────────────────────────────────────────────────────────────
  if (phase === "taking") {
    const answeredCount = Object.keys(answers).length;
    const unanswered = questions.length - answeredCount;
    return (
      <div style={card}>
        <div style={eyebrow}>
          {`// Quiz final · ${String(answeredCount)}/${String(questions.length)} répondues`}
        </div>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 18 }}>
          {questions.map((q, qi) => (
            <li key={q.id}>
              <p style={{ ...mono("#F5F5FA", 13), fontWeight: 600, margin: "0 0 8px" }}>
                {qi + 1}. {q.question}
              </p>
              <div style={{ display: "grid", gap: 6 }}>
                {q.options.map((o) => {
                  const selected = answers[q.id] === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        setAnswers((a) => ({ ...a, [q.id]: o.id }));
                      }}
                      style={{
                        textAlign: "left",
                        padding: "9px 12px",
                        fontFamily: "var(--font-mono)",
                        fontSize: 12.5,
                        cursor: "pointer",
                        color: selected ? "#05041A" : "#B8B5D1",
                        background: selected ? TEAL : "#05041A",
                        border: `1px solid ${selected ? TEAL : "#2A2560"}`,
                      }}
                    >
                      {o.text}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>

        {confirmUnanswered && unanswered > 0 && (
          <p style={{ ...mono(RED), marginTop: 14 }}>
            {unanswered} question{unanswered > 1 ? "s" : ""} sans réponse —{" "}
            {unanswered > 1 ? "comptées fausses" : "comptée fausse"}. Soumettre quand même ?
          </p>
        )}
        <PrimaryButton onClick={submit} disabled={pending}>
          {pending
            ? "Envoi…"
            : confirmUnanswered && unanswered > 0
              ? "Confirmer la soumission"
              : "Soumettre le quiz"}
        </PrimaryButton>
        {error && <p style={{ ...mono(RED), marginTop: 10 }}>{error}</p>}
      </div>
    );
  }

  // ── Intro (locked / unlocked / completed) ────────────────────────────────────
  if (pathCompleted) {
    return (
      <div style={card}>
        <div style={eyebrow}>{"// Quiz final · validé"}</div>
        <p style={mono("#B8B5D1")}>
          Tu as réussi le quiz final de ce parcours. Ton certificat est disponible.
        </p>
      </div>
    );
  }

  if (!lessonsComplete) {
    return (
      <div style={{ ...card, borderColor: "#2A2560" }}>
        <div style={{ ...eyebrow, color: "#6B6890" }}>{"// Quiz final · verrouillé"}</div>
        <p style={mono("#6B6890")}>
          Termine toutes les leçons du parcours pour débloquer le quiz final et obtenir ton
          certificat.
        </p>
      </div>
    );
  }

  return (
    <div style={{ ...card, borderColor: "rgba(10,255,212,0.25)" }}>
      <div style={eyebrow}>{"// Quiz final · débloqué"}</div>
      <p style={mono("#B8B5D1")}>
        Réponds au quiz final pour valider le parcours et obtenir ton certificat. Questions tirées
        au hasard ; échec → nouvelle tentative possible après 30 minutes.
      </p>
      <PrimaryButton onClick={start} disabled={pending}>
        {pending ? "Préparation…" : "Passer le quiz final"}
      </PrimaryButton>
      {error && <p style={{ ...mono(RED), marginTop: 10 }}>{error}</p>}
    </div>
  );
}

function ResultsList({ items }: { items: ResultItem[] }): React.ReactElement {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
      {items.map((r, i) => (
        <li
          key={r.questionId}
          style={{
            padding: "8px 10px",
            background: "#05041A",
            border: `1px solid ${r.correct ? "rgba(10,255,212,0.3)" : "rgba(255,71,87,0.3)"}`,
          }}
        >
          <div style={mono(r.correct ? TEAL : RED, 11.5)}>
            {r.correct ? "✓" : "✗"} Question {i + 1}
            {r.selected === null ? " · sans réponse" : ""}
          </div>
          {r.explanation && (
            <div style={{ ...mono("#8E8BB0", 11), marginTop: 4 }}>{r.explanation}</div>
          )}
        </li>
      ))}
    </ul>
  );
}
