"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  type StartQuizResult,
  type SubmitQuizResult,
  startQuizAttempt,
  submitQuizAttempt,
} from "../../_actions/quiz-actions";

type Question = NonNullable<StartQuizResult["questions"]>[number];

interface Props {
  pathId: string;
  pathSlug: string;
  pathTitle: string;
  refCode: string;
  hasQuiz: boolean;
  lessonsComplete: boolean;
  pathCompleted: boolean;
  certPublicId: string | null;
  questionCount: number;
  passThreshold: number;
  timeLimitMinutes: number;
  resumeStartedAtMs: number | null;
  cooldownUntilMs: number | null;
}

const TEAL = "#0AFFD4";
const RED = "#FF4757";
const INK = "#F5F5FA";
const MUTED = "#6B6890";

const shell: React.CSSProperties = {
  maxWidth: 880,
  margin: "0 auto",
  padding: "28px 20px 64px",
  color: INK,
};
const frame: React.CSSProperties = {
  position: "relative",
  border: "1px solid #2A2560",
  background: "rgba(5,4,26,0.7)",
  padding: 28,
};
const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: TEAL,
};
const mono = (color: string, size = 13): React.CSSProperties => ({
  fontFamily: "var(--font-mono)",
  fontSize: size,
  color,
  lineHeight: 1.65,
});
const cta = (bg: string, disabled?: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 22px",
  fontFamily: "var(--font-mono)",
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  cursor: disabled ? "not-allowed" : "pointer",
  color: bg === "transparent" ? MUTED : "#05041A",
  background: bg,
  border: bg === "transparent" ? "1px solid #2A2560" : "none",
  opacity: disabled ? 0.5 : 1,
  textDecoration: "none",
});

function fmt(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ExamFlow(props: Props): React.JSX.Element | null {
  const {
    pathId,
    pathSlug,
    pathTitle,
    refCode,
    hasQuiz,
    lessonsComplete,
    pathCompleted,
    certPublicId,
    questionCount,
    passThreshold,
    timeLimitMinutes,
    resumeStartedAtMs,
    cooldownUntilMs,
  } = props;

  const router = useRouter();
  const [phase, setPhase] = useState<"intro" | "taking" | "results">("intro");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitQuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const submittingRef = useRef(false);
  const resumedRef = useRef(false);

  const doSubmit = useCallback(
    async (auto: boolean) => {
      if (!attemptId || submittingRef.current) return;
      submittingRef.current = true;
      setBusy(true);
      setError(null);
      const res = await submitQuizAttempt(attemptId, answers);
      setBusy(false);
      if (!res.ok) {
        submittingRef.current = false;
        setError(res.error ?? "Soumission impossible.");
        if (auto) router.refresh(); // likely expired server-side → reload state
        return;
      }
      setResult(res);
      setPhase("results");
      setDeadlineMs(null);
      if (res.passed) router.refresh();
    },
    [attemptId, answers, router],
  );

  // Countdown — anchored to the server startedAt (via deadlineMs). Auto-submits at 0.
  useEffect(() => {
    if (phase !== "taking" || deadlineMs === null) return;
    const tick = () => {
      const r = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0) void doSubmit(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      clearInterval(id);
    };
  }, [phase, deadlineMs, doSubmit]);

  const begin = useCallback(
    (anchorMs: number) => {
      setBusy(true);
      setError(null);
      void (async () => {
        const res = await startQuizAttempt(pathId);
        setBusy(false);
        if (!res.ok || !res.attemptId || !res.questions) {
          setError(res.error ?? "Impossible de démarrer l'examen.");
          return;
        }
        setAttemptId(res.attemptId);
        setQuestions(res.questions);
        setIndex(0);
        setAnswers({});
        setDeadlineMs(anchorMs + timeLimitMinutes * 60_000);
        setPhase("taking");
      })();
    },
    [pathId, timeLimitMinutes],
  );

  // Resume an in-progress attempt on mount (countdown continues from server time).
  useEffect(() => {
    if (resumeStartedAtMs !== null && !resumedRef.current) {
      resumedRef.current = true;
      begin(resumeStartedAtMs);
    }
  }, [resumeStartedAtMs, begin]);

  if (!hasQuiz) {
    return (
      <div style={shell}>
        <BackLink slug={pathSlug} />
        <div style={frame}>
          <div style={eyebrow}>{"// Examen"}</div>
          <p style={{ ...mono(MUTED), marginTop: 10 }}>Aucun examen actif pour ce parcours.</p>
        </div>
      </div>
    );
  }

  // ── Results ──────────────────────────────────────────────────────────────────
  if (phase === "results" && result) {
    const passed = result.passed === true;
    return (
      <div style={shell}>
        <div style={frame}>
          <div style={{ ...eyebrow, color: passed ? TEAL : RED }}>
            {passed ? "// Examen réussi" : "// Examen échoué"}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, margin: "12px 0 18px" }}>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 800,
                fontSize: 56,
                color: passed ? TEAL : RED,
                lineHeight: 1,
              }}
            >
              {result.score}%
            </span>
            <span style={mono(passed ? TEAL : RED, 14)}>
              {passed ? "✓ Certificat débloqué" : `✗ Seuil ${String(passThreshold)}% non atteint`}
            </span>
          </div>

          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {(result.results ?? []).map((r, i) => (
              <li
                key={r.questionId}
                style={{
                  padding: "10px 12px",
                  background: "#05041A",
                  border: `1px solid ${r.correct ? "rgba(10,255,212,0.3)" : "rgba(255,71,87,0.3)"}`,
                }}
              >
                <div style={mono(r.correct ? TEAL : RED, 12)}>
                  {r.correct ? "✓" : "✗"} Question {i + 1}
                  {r.selected === null ? " · sans réponse" : ""}
                </div>
                {r.explanation && (
                  <div style={{ ...mono("#8E8BB0", 11.5), marginTop: 4 }}>{r.explanation}</div>
                )}
              </li>
            ))}
          </ul>

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            {passed ? (
              <Link href="/certifs" style={cta(TEAL)}>
                Voir mon certificat
              </Link>
            ) : (
              <span style={mono(MUTED)}>
                {"Nouvelle tentative possible après le délai d'attente (48 h)."}
              </span>
            )}
            <BackLink slug={pathSlug} inline />
          </div>
        </div>
      </div>
    );
  }

  // ── Taking (one question at a time) ──────────────────────────────────────────
  if (phase === "taking") {
    const q = questions[index];
    const answered = Object.keys(answers).length;
    const last = index === questions.length - 1;
    const low = remaining <= 60;
    return (
      <div style={shell}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <span style={eyebrow}>
            {`// Question ${String(index + 1)} / ${String(questions.length)}`}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: "0.06em",
              color: low ? RED : TEAL,
            }}
          >
            ⏱ {fmt(remaining)}
          </span>
        </div>

        <div style={{ height: 3, background: "#1F1B47", marginBottom: 18 }}>
          <div
            style={{
              height: "100%",
              width: `${String(Math.round(((index + 1) / questions.length) * 100))}%`,
              background: TEAL,
            }}
          />
        </div>

        <div style={frame}>
          {q && (
            <>
              <p style={{ ...mono(INK, 15), fontWeight: 600, margin: "0 0 14px" }}>{q.question}</p>
              <div style={{ display: "grid", gap: 8 }}>
                {q.options.map((o) => {
                  const sel = answers[q.id] === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        setAnswers((a) => ({ ...a, [q.id]: o.id }));
                      }}
                      style={{
                        textAlign: "left",
                        padding: "12px 14px",
                        fontFamily: "var(--font-mono)",
                        fontSize: 13.5,
                        cursor: "pointer",
                        color: sel ? "#05041A" : "#B8B5D1",
                        background: sel ? TEAL : "#05041A",
                        border: `1px solid ${sel ? TEAL : "#2A2560"}`,
                      }}
                    >
                      {o.text}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
          }}
        >
          <button
            type="button"
            disabled={index === 0}
            onClick={() => {
              setIndex((i) => Math.max(0, i - 1));
            }}
            style={cta("transparent", index === 0)}
          >
            ← Précédent
          </button>
          <span
            style={mono(MUTED, 11)}
          >{`${String(answered)} / ${String(questions.length)} répondues`}</span>
          {last ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void doSubmit(false);
              }}
              style={cta(TEAL, busy)}
            >
              {busy ? "Envoi…" : "Terminer l'examen"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIndex((i) => Math.min(questions.length - 1, i + 1));
              }}
              style={cta(TEAL)}
            >
              Suivant →
            </button>
          )}
        </div>
        {error && <p style={{ ...mono(RED), marginTop: 12 }}>{error}</p>}
      </div>
    );
  }

  // ── Intro / locked / cooldown / completed ────────────────────────────────────
  return (
    <div style={shell}>
      <BackLink slug={pathSlug} />
      <div style={frame}>
        <div style={eyebrow}>{"// Examen final"}</div>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 800,
            fontSize: 30,
            margin: "8px 0 4px",
          }}
        >
          {pathTitle}
        </h1>
        <div style={mono(MUTED, 11)}>{`// ${refCode} · Certification vérifiable`}</div>

        {pathCompleted ? (
          <div style={{ marginTop: 18 }}>
            <p style={mono(TEAL)}>
              {"Tu as déjà réussi l'examen de ce parcours. Ton certificat est disponible."}
            </p>
            <Link
              href={certPublicId ? `/verify/${certPublicId}` : "/certifs"}
              style={{ ...cta(TEAL), marginTop: 12 }}
            >
              Voir mon certificat
            </Link>
          </div>
        ) : !lessonsComplete ? (
          <p style={{ ...mono(MUTED), marginTop: 18 }}>
            {"Termine toutes les leçons du parcours pour débloquer l'examen final."}
          </p>
        ) : cooldownUntilMs ? (
          <p style={{ ...mono(RED), marginTop: 18 }}>
            {
              "Tu as déjà passé l'examen récemment. Nouvelle tentative disponible plus tard (délai d'attente en cours)."
            }
          </p>
        ) : (
          <>
            <div style={{ display: "flex", gap: 22, margin: "20px 0" }}>
              <Stat value={String(questionCount)} label="Questions" />
              <Stat value={`${String(timeLimitMinutes)}:00`} label="Chronométré" />
              <Stat value={`${String(passThreshold)}%`} label="Pour réussir" tone={TEAL} />
            </div>
            <p style={mono("#B8B5D1")}>
              {
                "L'examen est chronométré et les questions sont tirées au hasard. Une fois lancé, le chrono ne s'arrête plus — même si tu fermes l'onglet. Prépare-toi avant de commencer."
              }
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                begin(Date.now());
              }}
              style={{ ...cta(TEAL, busy), marginTop: 18 }}
            >
              {busy ? "Préparation…" : "Commencer l'examen →"}
            </button>
          </>
        )}
        {error && <p style={{ ...mono(RED), marginTop: 12 }}>{error}</p>}
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  tone,
}: { value: string; label: string; tone?: string }): React.JSX.Element {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 800,
          fontSize: 26,
          color: tone ?? INK,
        }}
      >
        {value}
      </div>
      <div style={mono(MUTED, 10)}>{label}</div>
    </div>
  );
}

function BackLink({ slug, inline }: { slug: string; inline?: boolean }): React.JSX.Element {
  return (
    <Link href={`/paths/${slug}`} style={{ ...cta("transparent"), marginBottom: inline ? 0 : 16 }}>
      ← Retour au parcours
    </Link>
  );
}
