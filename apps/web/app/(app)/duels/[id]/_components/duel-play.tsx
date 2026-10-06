"use client";

import Link from "next/link";
import React, { useEffect, useState, useTransition } from "react";
import { DUEL_STATUS_LABELS } from "@cyberlearn/lib/social/duel";
import type { DuelView } from "@/lib/social/duels";
import { answerDuelAction, duelViewAction } from "../../_actions/duel-actions";
import { RespondButtons } from "../../_components/respond-buttons";

/**
 * One duel, played: both scores at the top, the next question for the
 * reader, the right option shown once answered, and the result when both
 * are done. The page reads the duel again every few seconds while it is
 * going on, so the other player's score moves as they answer.
 */

const MONO = "var(--font-mono, monospace)";
/** How often the page reads the duel again while it is going on. */
const REFRESH_MS = 2500;

export function DuelPlay({ initial }: { initial: DuelView }): React.ReactElement {
  const [view, setView] = useState(initial);
  const [feedback, setFeedback] = useState<{ index: number; correct: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const live = view.status === "ACTIVE" || (view.status === "PENDING" && view.readerIsChallenger);
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      void duelViewAction(view.id).then((next) => {
        if (next !== null) setView(next);
      });
    }, REFRESH_MS);
    return () => {
      clearInterval(id);
    };
  }, [live, view.id]);

  const answered = new Set(view.readerAnswers.map((a) => a.index));
  const next = view.questions.find((q) => !answered.has(q.index)) ?? null;
  const last =
    feedback === null ? null : view.readerAnswers.find((a) => a.index === feedback.index);

  const answer = (index: number, selected: number): void => {
    startTransition(async () => {
      setError(null);
      const result = await answerDuelAction({ duelId: view.id, index, selected });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFeedback({ index, correct: result.correct });
      const fresh = await duelViewAction(view.id);
      if (fresh !== null) setView(fresh);
    });
  };

  return (
    <section aria-label={`Duel contre ${view.other.name}`} style={{ display: "grid", gap: 18 }}>
      <div className="card" style={{ padding: "16px 20px", display: "grid", gap: 10 }}>
        <span className="mono-label" style={{ color: "var(--cosmetic-accent)" }}>
          {"// "}Duel · {view.pathTitle} · {DUEL_STATUS_LABELS[view.status]}
        </span>
        <div
          aria-label="Les scores"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>Toi</div>
            <div style={{ fontFamily: MONO, fontSize: 22, color: "var(--cosmetic-accent)" }}>
              {String(view.readerScore.correct)}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              {String(view.readerScore.answered)} / {String(view.questionCount)} répondues
            </div>
          </div>
          <span style={{ fontFamily: MONO, color: "var(--color-text-muted)" }}>contre</span>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 600 }}>{view.other.name}</div>
            <div style={{ fontFamily: MONO, fontSize: 22, color: "var(--color-text-primary)" }}>
              {String(view.otherScore.correct)}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              {String(view.otherScore.answered)} / {String(view.questionCount)} répondues
            </div>
          </div>
        </div>
      </div>

      {view.status === "PENDING" ? (
        view.readerIsChallenger ? (
          <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>
            En attente de {view.other.name} : le duel commence quand il ou elle l&apos;accepte, dans
            la journée.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <p style={{ margin: 0 }}>
              {view.other.name} te défie sur « {view.pathTitle} » : cinq questions, le meilleur
              score gagne.
            </p>
            <RespondButtons duelId={view.id} />
          </div>
        )
      ) : null}

      {view.status === "DECLINED" || view.status === "EXPIRED" ? (
        <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
          {view.status === "DECLINED"
            ? "Ce duel a été refusé."
            : "Ce duel n'a pas été joué à temps."}
        </p>
      ) : null}

      {last !== null && last !== undefined && feedback !== null ? (
        <p
          aria-live="polite"
          style={{
            margin: 0,
            color: feedback.correct ? "var(--cosmetic-accent)" : "var(--color-danger)",
          }}
        >
          {feedback.correct ? "Bonne réponse." : "Raté."}
          {!feedback.correct && last.correctIndex !== null
            ? ` La bonne réponse : ${view.questions.find((q) => q.index === last.index)?.options[last.correctIndex] ?? ""}.`
            : ""}
        </p>
      ) : null}

      {view.status === "ACTIVE" && next !== null ? (
        <div className="card" style={{ padding: "16px 20px", display: "grid", gap: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 12, color: "var(--color-text-muted)" }}>
            Question {String(next.index + 1)} / {String(view.questionCount)} · {next.domain}
          </span>
          <p style={{ margin: 0, fontWeight: 600 }}>{next.question}</p>
          <div style={{ display: "grid", gap: 6 }}>
            {next.options.map((option, k) => (
              <button
                key={k}
                type="button"
                className="btn btn--ghost"
                style={{ justifyContent: "flex-start", textAlign: "left" }}
                disabled={pending}
                onClick={() => {
                  answer(next.index, k);
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {view.status === "ACTIVE" && next === null ? (
        <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>
          Tu as tout répondu. En attente de {view.other.name} : le résultat tombe quand il ou elle a
          fini, ou à la fin de la journée.
        </p>
      ) : null}

      {view.status === "FINISHED" ? (
        <div className="card" style={{ padding: "16px 20px", display: "grid", gap: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 700 }}>
            {view.winner === "draw"
              ? "Égalité."
              : view.winner === "reader"
                ? "Victoire !"
                : "Défaite."}
          </span>
          <span style={{ color: "var(--color-text-secondary)" }}>
            {String(view.readerScore.correct)} à {String(view.otherScore.correct)} contre{" "}
            {view.other.name}.
          </span>
        </div>
      ) : null}

      {error !== null ? (
        <p role="alert" style={{ margin: 0, color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}

      <Link href="/duels" className="btn btn--ghost btn--sm" style={{ justifySelf: "start" }}>
        Tous tes duels
      </Link>
    </section>
  );
}
