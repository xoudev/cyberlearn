"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";
import {
  createQuestionAction,
  deleteQuestionAction,
  saveQuizSettingsAction,
  updateQuestionAction,
} from "../_actions/quiz-admin-actions";

interface Option {
  id: string;
  text: string;
}
interface Question {
  id: string;
  question: string;
  options: Option[];
  correctOptionId: string;
  explanation: string | null;
  orderIndex: number;
  isActive: boolean;
}
interface Quiz {
  id: string;
  passThreshold: number;
  questionsToDraw: number;
  isActive: boolean;
  activeQuestionCount: number;
}
interface Props {
  path: { id: string; title: string; slug: string };
  quiz: Quiz | null;
  questions: Question[];
}

// ── Shared admin tokens (aligned with the Lessons / Badges CRUD pages) ──────────
const BORDER = "#2A2560";
const DANGER = "#FF4D6D";
const TURQ = "#0AFFD4";
const BLUE = "#0024FF";

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: 9.5,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#6B6890",
  marginBottom: 6,
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "rgba(5,4,26,0.8)",
  border: `1px solid ${BORDER}`,
  color: "#F5F5FA",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  padding: "11px 14px",
  outline: "none",
  boxSizing: "border-box",
};

const CARD_STYLE: React.CSSProperties = {
  background: "rgba(10,8,38,0.6)",
  border: "1px solid #1F1B47",
  borderLeft: `3px solid ${BORDER}`,
  borderRadius: 8,
  padding: "20px 22px",
  marginBottom: 20,
};

const SECTION_EYEBROW: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#44406B",
  margin: "0 0 16px",
};

const primaryBtnStyle = (pending: boolean): React.CSSProperties => ({
  padding: "12px 26px",
  background: BLUE,
  border: `1px solid ${BLUE}`,
  color: "#fff",
  fontFamily: "var(--font-mono)",
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  cursor: pending ? "not-allowed" : "pointer",
  opacity: pending ? 0.6 : 1,
});

const ghostBtnStyle: React.CSSProperties = {
  padding: "12px 22px",
  background: "transparent",
  border: `1px solid ${BORDER}`,
  color: "#6B6890",
  fontFamily: "var(--font-mono)",
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const dangerBtnStyle = (pending: boolean): React.CSSProperties => ({
  padding: "9px 16px",
  background: "transparent",
  border: "1px solid rgba(255,77,109,0.4)",
  color: DANGER,
  fontFamily: "var(--font-mono)",
  fontWeight: 700,
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: pending ? "not-allowed" : "pointer",
  opacity: pending ? 0.6 : 1,
});

const smallGhostBtnStyle: React.CSSProperties = {
  padding: "9px 16px",
  background: "transparent",
  border: `1px solid ${BORDER}`,
  color: "#B8B5D1",
  fontFamily: "var(--font-mono)",
  fontWeight: 700,
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  color: DANGER,
  margin: "8px 0 0",
};

const warnStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  lineHeight: 1.6,
  color: "#FFB84D",
  margin: "10px 0 0",
  padding: "10px 14px",
  background: "rgba(255,184,77,0.07)",
  border: "1px solid rgba(255,184,77,0.3)",
  borderLeft: "3px solid #FFB84D",
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div>
      <label style={LABEL_STYLE}>{label}</label>
      {hint && (
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "#44406B",
            margin: "0 0 6px",
          }}
        >
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

export function QuizManager({ path, quiz, questions }: Props): React.JSX.Element {
  return (
    <div className="admin-page-content" style={{ maxWidth: 820 }}>
      <div className="admin-page-header">
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#6B6890",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <span style={{ width: 14, height: 1, background: DANGER, display: "inline-block" }} />
            Admin / Parcours / Quiz
          </div>
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 24,
              fontWeight: 700,
              color: "#F5F5FA",
              margin: 0,
            }}
          >
            Quiz · {path.title}
          </h1>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#6B6890",
              margin: "8px 0 0",
            }}
          >
            {"Quiz final qui conditionne l'émission du certificat de ce parcours."}
          </p>
        </div>
        <Link
          href={`/paths/${path.id}/edit`}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#6B6890",
            border: `1px solid ${BORDER}`,
            padding: "9px 16px",
            whiteSpace: "nowrap",
          }}
        >
          ← Parcours
        </Link>
      </div>

      <SettingsForm path={path} quiz={quiz} />

      {quiz ? (
        <QuestionsSection path={path} quiz={quiz} questions={questions} />
      ) : (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#6B6890" }}>
          {"Enregistre d'abord les réglages pour créer le quiz, puis ajoute des questions."}
        </p>
      )}
    </div>
  );
}

function SettingsForm({
  path,
  quiz,
}: {
  path: Props["path"];
  quiz: Quiz | null;
}): React.JSX.Element {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [passThreshold, setPassThreshold] = useState(quiz?.passThreshold ?? 70);
  const [questionsToDraw, setQuestionsToDraw] = useState(quiz?.questionsToDraw ?? 1);
  const [isActive, setIsActive] = useState(quiz?.isActive ?? false);
  const [error, setError] = useState<string | null>(null);

  const activeCount = quiz?.activeQuestionCount ?? 0;
  const notReady = quiz !== null && questionsToDraw > activeCount;

  function save(): void {
    setError(null);
    start(async () => {
      const res = await saveQuizSettingsAction({
        pathId: path.id,
        passThreshold,
        questionsToDraw,
        isActive,
      });
      if (!res.ok) setError(res.error ?? "Échec.");
      else router.refresh();
    });
  }

  return (
    <div style={CARD_STYLE}>
      <p style={SECTION_EYEBROW}>Réglages</p>
      <div className="admin-form-grid-2" style={{ gap: 18 }}>
        <Field label="Seuil de réussite (%)">
          <input
            style={INPUT_STYLE}
            type="number"
            min={0}
            max={100}
            value={passThreshold}
            onChange={(e) => {
              setPassThreshold(Number(e.target.value));
            }}
          />
        </Field>
        <Field label="Questions tirées par tentative">
          <input
            style={INPUT_STYLE}
            type="number"
            min={1}
            value={questionsToDraw}
            onChange={(e) => {
              setQuestionsToDraw(Number(e.target.value));
            }}
          />
        </Field>
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 16,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => {
            setIsActive(e.target.checked);
          }}
          style={{ accentColor: TURQ, width: 16, height: 16 }}
        />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#B8B5D1" }}>
          Quiz actif (requis pour obtenir le certificat)
        </span>
      </label>

      {!isActive && (
        <p style={warnStyle}>
          {
            "⚠️ Désactivé : plus aucun quiz requis — le certificat sera émis dès que toutes les leçons sont complétées."
          }
        </p>
      )}
      {notReady && (
        <p style={warnStyle}>
          {`⚠️ Quiz « non prêt » : ${String(questionsToDraw)} questions tirées mais seulement ${String(activeCount)} active(s). Les apprenants verront une erreur tant que le pool est insuffisant.`}
        </p>
      )}

      <div style={{ marginTop: 18 }}>
        <button type="button" style={primaryBtnStyle(pending)} onClick={save} disabled={pending}>
          {pending ? "Enregistrement…" : quiz ? "Mettre à jour" : "Créer le quiz"}
        </button>
      </div>
      {error && <p style={errorStyle}>{error}</p>}
    </div>
  );
}

function QuestionsSection({
  path,
  quiz,
  questions,
}: {
  path: Props["path"];
  quiz: Quiz;
  questions: Question[];
}): React.JSX.Element {
  const [adding, setAdding] = useState(false);
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 16,
            fontWeight: 700,
            color: "#F5F5FA",
            margin: 0,
          }}
        >
          Questions{" "}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#6B6890" }}>
            ({questions.length} · {quiz.activeQuestionCount} active(s))
          </span>
        </h2>
        {!adding && (
          <button
            type="button"
            style={primaryBtnStyle(false)}
            onClick={() => {
              setAdding(true);
            }}
          >
            + Ajouter
          </button>
        )}
      </div>

      {adding && (
        <QuestionForm
          path={path}
          quizId={quiz.id}
          defaultOrderIndex={questions.length}
          onDone={() => {
            setAdding(false);
          }}
        />
      )}

      {questions.map((q) => (
        <QuestionRow key={q.id} path={path} question={q} />
      ))}
    </div>
  );
}

function QuestionRow({
  path,
  question,
}: {
  path: Props["path"];
  question: Question;
}): React.JSX.Element {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove(): void {
    if (!confirm("Supprimer cette question ?")) return;
    setError(null);
    start(async () => {
      const res = await deleteQuestionAction({ questionId: question.id, pathId: path.id });
      if (!res.ok) setError(res.error ?? "Échec.");
      else router.refresh();
    });
  }

  if (editing) {
    return (
      <QuestionForm
        path={path}
        quizId=""
        question={question}
        onDone={() => {
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div style={CARD_STYLE}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "#F5F5FA" }}>
          <span style={{ fontFamily: "var(--font-mono)", color: "#6B6890" }}>
            #{question.orderIndex}
          </span>{" "}
          {question.question}
          {!question.isActive && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#FFB84D",
                marginLeft: 8,
              }}
            >
              (inactive)
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            style={smallGhostBtnStyle}
            onClick={() => {
              setEditing(true);
            }}
          >
            Éditer
          </button>
          <button type="button" style={dangerBtnStyle(pending)} onClick={remove} disabled={pending}>
            Suppr.
          </button>
        </div>
      </div>
      <ul
        style={{
          margin: "12px 0 0",
          paddingLeft: 18,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "#B8B5D1",
          lineHeight: 1.8,
        }}
      >
        {question.options.map((o) => (
          <li key={o.id} style={{ color: o.id === question.correctOptionId ? TURQ : undefined }}>
            {o.id === question.correctOptionId ? "✓ " : ""}
            <b>{o.id}</b> — {o.text}
          </li>
        ))}
      </ul>
      {error && <p style={errorStyle}>{error}</p>}
    </div>
  );
}

function QuestionForm({
  path,
  quizId,
  question,
  defaultOrderIndex,
  onDone,
}: {
  path: Props["path"];
  quizId: string;
  question?: Question;
  defaultOrderIndex?: number;
  onDone: () => void;
}): React.JSX.Element {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState(question?.question ?? "");
  const [options, setOptions] = useState<Option[]>(
    question?.options ?? [
      { id: "a", text: "" },
      { id: "b", text: "" },
    ],
  );
  const [correctOptionId, setCorrectOptionId] = useState(question?.correctOptionId ?? "a");
  const [explanation, setExplanation] = useState(question?.explanation ?? "");
  const [orderIndex, setOrderIndex] = useState(question?.orderIndex ?? defaultOrderIndex ?? 0);
  const [isActive, setIsActive] = useState(question?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  function setOpt(i: number, patch: Partial<Option>): void {
    setOptions((prev) => prev.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  }
  function addOpt(): void {
    setOptions((prev) => [...prev, { id: "", text: "" }]);
  }
  function removeOpt(i: number): void {
    setOptions((prev) => prev.filter((_, j) => j !== i));
  }

  function submit(): void {
    setError(null);
    const payload = { question: text, options, correctOptionId, explanation, orderIndex, isActive };
    start(async () => {
      const res = question
        ? await updateQuestionAction({ questionId: question.id, pathId: path.id, ...payload })
        : await createQuestionAction({ quizId, pathId: path.id, ...payload });
      if (!res.ok) {
        setError(res.error ?? "Échec.");
        return;
      }
      onDone();
      router.refresh();
    });
  }

  return (
    <div style={{ ...CARD_STYLE, borderLeftColor: TURQ }}>
      <p style={SECTION_EYEBROW}>{question ? "Éditer la question" : "Nouvelle question"}</p>

      <Field label="Question">
        <textarea
          style={{ ...INPUT_STYLE, minHeight: 56, resize: "vertical" }}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
          }}
        />
      </Field>

      <div style={{ marginTop: 16 }}>
        <label style={LABEL_STYLE}>Options (la bonne réponse est cochée)</label>
        {options.map((o, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input
              type="radio"
              name="correct"
              checked={correctOptionId === o.id}
              onChange={() => {
                setCorrectOptionId(o.id);
              }}
              title="Bonne réponse"
              style={{ accentColor: TURQ, width: 16, height: 16, flexShrink: 0 }}
            />
            <input
              style={{ ...INPUT_STYLE, width: 70, flexShrink: 0 }}
              placeholder="id"
              value={o.id}
              onChange={(e) => {
                setOpt(i, { id: e.target.value });
              }}
            />
            <input
              style={INPUT_STYLE}
              placeholder="Texte de l'option"
              value={o.text}
              onChange={(e) => {
                setOpt(i, { text: e.target.value });
              }}
            />
            {options.length > 2 && (
              <button
                type="button"
                style={{ ...dangerBtnStyle(false), padding: "9px 13px" }}
                onClick={() => {
                  removeOpt(i);
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button type="button" style={smallGhostBtnStyle} onClick={addOpt}>
          + Option
        </button>
      </div>

      <div className="admin-form-grid-2" style={{ gap: 18, marginTop: 16 }}>
        <Field label="Ordre">
          <input
            style={INPUT_STYLE}
            type="number"
            min={0}
            value={orderIndex}
            onChange={(e) => {
              setOrderIndex(Number(e.target.value));
            }}
          />
        </Field>
        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            alignSelf: "end",
            paddingBottom: 11,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => {
              setIsActive(e.target.checked);
            }}
            style={{ accentColor: TURQ, width: 16, height: 16 }}
          />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#B8B5D1" }}>
            Active
          </span>
        </label>
      </div>

      <div style={{ marginTop: 16 }}>
        <Field label="Explication (affichée après soumission, optionnel)">
          <textarea
            style={{ ...INPUT_STYLE, minHeight: 44, resize: "vertical" }}
            value={explanation}
            onChange={(e) => {
              setExplanation(e.target.value);
            }}
          />
        </Field>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button type="button" style={primaryBtnStyle(pending)} onClick={submit} disabled={pending}>
          {pending ? "…" : question ? "Enregistrer" : "Ajouter"}
        </button>
        <button type="button" style={ghostBtnStyle} onClick={onDone}>
          Annuler
        </button>
      </div>
      {error && <p style={errorStyle}>{error}</p>}
    </div>
  );
}
