"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  domainVerdict,
  weakestDomains,
  type MockQuestion,
  type MockResult,
} from "@cyberlearn/lib/exam/mock";
import type { MockOverview } from "@/lib/exam/mock-exam";
import { startMockExamAction, submitMockExamAction } from "../_actions/mock-exam-actions";

/**
 * A mock exam, from the overview to the review: the modules it covers and
 * the attempts already made, then the questions with a countdown (handed in
 * by itself at zero), then the score by module, what to go back to, and each
 * question with its answer. Client-side because it keeps the clock and the
 * answers; the draw and the score are the server's.
 */

const MONO = "var(--font-mono, monospace)";

type Stage =
  | { kind: "intro" }
  | {
      kind: "running";
      attemptId: string;
      deadline: number;
      questions: MockQuestion[];
    }
  | { kind: "result"; result: MockResult; late: boolean };

function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function verdictColor(percent: number): string {
  if (percent >= 80) return "var(--cosmetic-accent)";
  if (percent >= 50) return "var(--color-warning)";
  return "var(--color-danger)";
}

const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

export function MockExamFlow({ overview }: { overview: MockOverview }): React.ReactElement {
  const [stage, setStage] = useState<Stage>({ kind: "intro" });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const submitting = useRef(false);

  const start = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const started = await startMockExamAction(overview.pathId);
    setBusy(false);
    if (!started.ok) {
      setError(started.error);
      return;
    }
    setAnswers({});
    submitting.current = false;
    setStage({
      kind: "running",
      attemptId: started.attemptId,
      deadline: new Date(started.startedAt).getTime() + started.timeLimitMinutes * 60_000,
      questions: started.questions,
    });
  };

  const submit = useCallback(async (): Promise<void> => {
    if (stage.kind !== "running" || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    const handed = await submitMockExamAction(stage.attemptId, answers);
    setBusy(false);
    if (!handed.ok) {
      submitting.current = false;
      setError(handed.error);
      return;
    }
    setStage({ kind: "result", result: handed.result, late: handed.late });
  }, [stage, answers]);

  // The clock: a tick a second while running, and the attempt handed in at zero.
  useEffect(() => {
    if (stage.kind !== "running") return;
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [stage.kind]);
  useEffect(() => {
    if (stage.kind === "running" && now >= stage.deadline) void submit();
  }, [now, stage, submit]);

  const byDomain = useMemo(() => {
    if (stage.kind !== "running") return [];
    const groups: { domain: string; questions: MockQuestion[] }[] = [];
    for (const question of stage.questions) {
      const last = groups.at(-1);
      if (last?.domain === question.domain) last.questions.push(question);
      else groups.push({ domain: question.domain, questions: [question] });
    }
    return groups;
  }, [stage]);

  if (stage.kind === "running") {
    const left = stage.deadline - now;
    const answered = Object.keys(answers).length;
    return (
      <section aria-label="Examen blanc en cours" style={{ display: "grid", gap: 20 }}>
        <div
          className="card"
          style={{
            position: "sticky",
            top: 12,
            zIndex: 2,
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 13 }}>
            {String(answered)} / {String(stage.questions.length)} répondues
          </span>
          <span
            aria-live="off"
            aria-label="Temps restant"
            style={{
              fontFamily: MONO,
              fontSize: 18,
              color: left < 60_000 ? "var(--color-danger)" : "var(--cosmetic-accent)",
            }}
          >
            {clock(left)}
          </span>
          <button
            type="button"
            className="btn btn--accent btn--sm"
            onClick={() => void submit()}
            disabled={busy}
          >
            Rendre la copie
          </button>
        </div>
        {error !== null ? (
          <p role="alert" style={{ margin: 0, color: "var(--color-danger)" }}>
            {error}
          </p>
        ) : null}
        {byDomain.map((group) => (
          <fieldset
            key={group.domain}
            style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 14 }}
          >
            <legend
              className="mono-label"
              style={{ color: "var(--cosmetic-accent)", marginBottom: 6 }}
            >
              {"// "}
              {group.domain}
            </legend>
            {group.questions.map((question) => (
              <div key={question.index} className="card" style={{ padding: "14px 18px" }}>
                <p style={{ margin: "0 0 10px", fontWeight: 600 }}>
                  {String(question.index + 1)}. {question.question}
                </p>
                <div
                  role="radiogroup"
                  aria-label={question.question}
                  style={{ display: "grid", gap: 6 }}
                >
                  {question.options.map((option, k) => {
                    const id = `mock-${String(question.index)}-${String(k)}`;
                    return (
                      <label
                        key={id}
                        htmlFor={id}
                        style={{ display: "flex", gap: 10, cursor: "pointer" }}
                      >
                        <input
                          id={id}
                          type="radio"
                          name={`mock-${String(question.index)}`}
                          checked={answers[String(question.index)] === k}
                          onChange={() => {
                            setAnswers((prev) => ({ ...prev, [String(question.index)]: k }));
                          }}
                        />
                        <span>{option}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </fieldset>
        ))}
        <button
          type="button"
          className="btn btn--accent"
          onClick={() => void submit()}
          disabled={busy}
          style={{ justifySelf: "start" }}
        >
          Rendre la copie
        </button>
      </section>
    );
  }

  if (stage.kind === "result") {
    const { result, late } = stage;
    const weakest = weakestDomains(result.domains);
    return (
      <section aria-label="Résultat de l'examen blanc" style={{ display: "grid", gap: 20 }}>
        <div className="card" style={{ padding: "18px 20px", display: "grid", gap: 6 }}>
          <span className="mono-label" style={{ color: "var(--cosmetic-accent)" }}>
            {"// "}Résultat
          </span>
          <p
            style={{ margin: 0, fontSize: 28, fontWeight: 700, color: verdictColor(result.score) }}
          >
            {String(result.score)} %
          </p>
          <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>
            {String(result.correct)} bonnes réponses sur {String(result.total)}
            {late ? ", copie rendue après le temps imparti" : ""}.
          </p>
          {weakest.length > 0 ? (
            <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>
              À revoir en premier : {weakest.map((d) => d.domain).join(", ")}.
            </p>
          ) : (
            <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>
              Tous les modules au-dessus de 70 % : tu es prêt pour l&apos;examen final.
            </p>
          )}
        </div>

        <ul
          aria-label="Score par module"
          style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}
        >
          {result.domains.map((domain) => (
            <li
              key={domain.domain}
              className="card"
              style={{ padding: "12px 16px", display: "grid", gap: 6 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontWeight: 600 }}>{domain.domain}</span>
                <span style={{ fontFamily: MONO, color: verdictColor(domain.percent) }}>
                  {String(domain.correct)} / {String(domain.total)} ·{" "}
                  {domainVerdict(domain.percent)}
                </span>
              </div>
              <div
                aria-hidden="true"
                style={{ height: 6, background: "var(--color-border-subtle)", overflow: "hidden" }}
              >
                <div
                  style={{
                    width: `${String(domain.percent)}%`,
                    height: "100%",
                    background: verdictColor(domain.percent),
                  }}
                />
              </div>
            </li>
          ))}
        </ul>

        <section aria-label="Correction" style={{ display: "grid", gap: 10 }}>
          <span className="mono-label" style={{ color: "var(--color-text-muted)" }}>
            {"// "}Correction
          </span>
          {result.review.map((item) => (
            <div
              key={item.index}
              className="card card--sunken"
              style={{ padding: "12px 16px", display: "grid", gap: 6 }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>
                {item.right ? "✓" : "✗"} {String(item.index + 1)}. {item.question}
              </p>
              <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-secondary)" }}>
                Ta réponse : {item.selected === null ? "aucune" : item.options[item.selected]}
                {item.right ? "" : ` · bonne réponse : ${item.options[item.correct] ?? ""}`}
              </p>
              {item.explanation !== null ? (
                <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)" }}>
                  {item.explanation}
                </p>
              ) : null}
            </div>
          ))}
        </section>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn--accent btn--sm"
            onClick={() => void start()}
            disabled={busy}
          >
            Recommencer avec d&apos;autres questions
          </button>
          <Link href={`/paths/${overview.pathSlug}`} className="btn btn--ghost btn--sm">
            Retour au parcours
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Examen blanc" style={{ display: "grid", gap: 20 }}>
      <div className="card" style={{ padding: "18px 20px", display: "grid", gap: 8 }}>
        <span className="mono-label" style={{ color: "var(--cosmetic-accent)" }}>
          {"// "}Examen blanc · {overview.pathTitle}
        </span>
        <p style={{ margin: 0, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          {String(overview.questionCount)} questions tirées des quiz du parcours, trois par module,
          en {String(overview.timeLimitMinutes)} minutes. Comme à une certification, le score se lit
          par domaine : chaque module dit ce qui est acquis et ce qui reste à revoir. C&apos;est un
          entraînement : ni certificat, ni XP, autant de fois que tu veux.
        </p>
      </div>

      <ul
        aria-label="Les modules couverts"
        style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}
      >
        {overview.domains.map((domain) => (
          <li
            key={domain.domain}
            style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}
          >
            <span>{domain.domain}</span>
            <span style={{ fontFamily: MONO, color: "var(--color-text-muted)" }}>
              {String(domain.drawn)} question{domain.drawn > 1 ? "s" : ""}
            </span>
          </li>
        ))}
      </ul>

      {overview.history.length > 0 ? (
        <section aria-label="Tes examens blancs" style={{ display: "grid", gap: 6 }}>
          <span className="mono-label" style={{ color: "var(--color-text-muted)" }}>
            {"// "}Tes derniers examens blancs
          </span>
          {overview.history.map((attempt) => (
            <div
              key={attempt.submittedAt}
              style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}
            >
              <span>{dayFormat.format(new Date(attempt.submittedAt))}</span>
              <span style={{ fontFamily: MONO, color: verdictColor(attempt.score) }}>
                {String(attempt.score)} %{attempt.late ? " (hors délai)" : ""}
              </span>
            </div>
          ))}
        </section>
      ) : null}

      {error !== null ? (
        <p role="alert" style={{ margin: 0, color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}
      {overview.ready ? (
        <button
          type="button"
          className="btn btn--accent"
          onClick={() => void start()}
          disabled={busy}
          style={{ justifySelf: "start" }}
        >
          {overview.running !== null ? "Reprendre l'examen en cours" : "Commencer l'examen blanc"}
        </button>
      ) : (
        <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
          Ce parcours n&apos;a pas encore assez de questions pour un examen blanc.
        </p>
      )}
    </section>
  );
}
