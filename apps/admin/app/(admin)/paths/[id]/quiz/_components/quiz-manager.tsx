"use client";

import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";
import { useAdminConfirmation } from "../../../../_components/admin-confirmation";
import { notifyResult } from "@/lib/notify";
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

// ── Shared admin styles: the kit classes carry the look, these only what is
// particular to this editor ───────────────────────────────────────────────────
const CARD_STYLE: React.CSSProperties = {
  background: "var(--a-surface)",
  border: "1px solid var(--a-border)",
  borderLeft: "3px solid var(--a-border-2)",
  padding: "20px 22px",
  marginBottom: 20,
};

/** A button that is waiting on its action: not clickable, and looks it. */
const busyStyle = (pending: boolean): React.CSSProperties => ({
  cursor: pending ? "not-allowed" : "pointer",
  opacity: pending ? 0.6 : 1,
});

const errorStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  color: "var(--a-danger)",
  margin: "8px 0 0",
};

const warnStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  lineHeight: 1.6,
  color: "var(--a-warning)",
  margin: "10px 0 0",
  padding: "10px 14px",
  background: "color-mix(in srgb, var(--a-warning) 7%, transparent)",
  borderLeft: "2px solid var(--a-warning)",
};

const CHECK_ROW_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minHeight: 44,
  cursor: "pointer",
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
    <div className="a-field">
      <label className="a-label">{label}</label>
      {hint && (
        <p className="a-field-hint" style={{ margin: 0 }}>
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

export function QuizManager({ path, quiz, questions }: Props): React.JSX.Element {
  return (
    <>
      <SettingsForm path={path} quiz={quiz} />

      {quiz ? (
        <QuestionsSection path={path} quiz={quiz} questions={questions} />
      ) : (
        <p className="a-field-hint">
          {"Enregistre d'abord les réglages pour créer le quiz, puis ajoute des questions."}
        </p>
      )}
    </>
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
      // The error stays under the settings it is about; the success, which
      // used to say nothing, is a toast.
      const ok = notifyResult(res, {
        success: quiz ? "Réglages du quiz enregistrés." : "Quiz créé.",
        error: false,
      });
      if (!ok) setError(res.error ?? "Échec.");
      else router.refresh();
    });
  }

  return (
    <div style={CARD_STYLE}>
      <h2 className="a-section-title" style={{ marginBottom: 16 }}>
        Réglages
      </h2>
      <div className="admin-form-grid-2" style={{ gap: 18 }}>
        <Field label="Seuil de réussite (%)">
          <input
            className="a-input"
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
            className="a-input"
            type="number"
            min={1}
            value={questionsToDraw}
            onChange={(e) => {
              setQuestionsToDraw(Number(e.target.value));
            }}
          />
        </Field>
      </div>

      <label style={{ ...CHECK_ROW_STYLE, marginTop: 16 }}>
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => {
            setIsActive(e.target.checked);
          }}
          style={{ accentColor: "var(--a-accent)", width: 16, height: 16 }}
        />
        <span style={{ fontSize: 13, color: "var(--a-fg-2)" }}>
          Quiz actif (requis pour obtenir le certificat)
        </span>
      </label>

      {!isActive && (
        <p style={warnStyle}>
          {
            "⚠️ Désactivé : plus aucun quiz requis ; le certificat sera émis dès que toutes les leçons sont complétées."
          }
        </p>
      )}
      {notReady && (
        <p style={warnStyle}>
          {`⚠️ Quiz « non prêt » : ${String(questionsToDraw)} questions tirées mais seulement ${String(activeCount)} active(s). Les apprenants verront une erreur tant que le pool est insuffisant.`}
        </p>
      )}

      <div style={{ marginTop: 18 }}>
        <button
          type="button"
          className="a-btn a-btn--primary"
          style={busyStyle(pending)}
          onClick={save}
          disabled={pending}
        >
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
        <h2 className="a-section-title">
          Questions{" "}
          <span className="a-meta-label" style={{ textTransform: "none" }}>
            ({questions.length} · {quiz.activeQuestionCount} active(s))
          </span>
        </h2>
        {!adding && (
          <button
            type="button"
            className="a-btn a-btn--primary"
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

  const confirm = useAdminConfirmation();
  async function remove(): Promise<void> {
    if (
      !(await confirm(
        `Parcours « ${path.title} » : supprimer la question « ${question.question} » ?`,
      ))
    )
      return;
    setError(null);
    start(async () => {
      const res = await deleteQuestionAction({ questionId: question.id, pathId: path.id });
      const ok = notifyResult(res, { success: "Question supprimée.", error: false });
      if (!ok) setError(res.error ?? "Échec.");
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
        <div style={{ fontSize: 14, color: "var(--a-fg)" }}>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--a-muted)" }}>
            #{question.orderIndex}
          </span>{" "}
          {question.question}
          {!question.isActive && (
            <span style={{ fontSize: 12, color: "var(--a-warning)", marginLeft: 8 }}>
              (inactive)
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            className="a-btn a-btn--ghost a-btn--sm"
            onClick={() => {
              setEditing(true);
            }}
          >
            Éditer
          </button>
          <button
            type="button"
            className="a-btn a-btn--danger a-btn--sm"
            style={busyStyle(pending)}
            onClick={() => {
              void remove();
            }}
            disabled={pending}
          >
            Suppr.
          </button>
        </div>
      </div>
      <ul
        style={{
          margin: "12px 0 0",
          paddingLeft: 18,
          fontSize: 13,
          color: "var(--a-fg-2)",
          lineHeight: 1.8,
        }}
      >
        {question.options.map((o) => (
          <li
            key={o.id}
            style={{ color: o.id === question.correctOptionId ? "var(--a-success)" : undefined }}
          >
            {o.id === question.correctOptionId ? "✓ " : ""}
            <b className="a-mono">{o.id}</b> : {o.text}
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
      const ok = notifyResult(res, {
        success: question ? "Question mise à jour." : "Question ajoutée.",
        error: false,
      });
      if (!ok) {
        setError(res.error ?? "Échec.");
        return;
      }
      onDone();
      router.refresh();
    });
  }

  return (
    <div style={{ ...CARD_STYLE, borderLeftColor: "var(--a-accent)" }}>
      <h2 className="a-section-title" style={{ marginBottom: 16 }}>
        {question ? "Éditer la question" : "Nouvelle question"}
      </h2>

      <Field label="Question">
        <textarea
          className="a-textarea"
          style={{ minHeight: 56 }}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
          }}
        />
      </Field>

      <div style={{ marginTop: 16 }}>
        <label className="a-label" style={{ display: "block", marginBottom: 7 }}>
          Options (la bonne réponse est cochée)
        </label>
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
              style={{ accentColor: "var(--a-accent)", width: 16, height: 16, flexShrink: 0 }}
            />
            <input
              className="a-input"
              style={{ width: 70, flexShrink: 0, fontFamily: "var(--font-mono)" }}
              placeholder="id"
              value={o.id}
              onChange={(e) => {
                setOpt(i, { id: e.target.value });
              }}
            />
            <input
              className="a-input"
              placeholder="Texte de l'option"
              value={o.text}
              onChange={(e) => {
                setOpt(i, { text: e.target.value });
              }}
            />
            {options.length > 2 && (
              <button
                type="button"
                className="a-btn a-btn--danger a-btn--sm"
                onClick={() => {
                  removeOpt(i);
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={addOpt}>
          + Option
        </button>
      </div>

      <div className="admin-form-grid-2" style={{ gap: 18, marginTop: 16 }}>
        <Field label="Ordre">
          <input
            className="a-input"
            type="number"
            min={0}
            value={orderIndex}
            onChange={(e) => {
              setOrderIndex(Number(e.target.value));
            }}
          />
        </Field>
        <label style={{ ...CHECK_ROW_STYLE, alignSelf: "end" }}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => {
              setIsActive(e.target.checked);
            }}
            style={{ accentColor: "var(--a-accent)", width: 16, height: 16 }}
          />
          <span style={{ fontSize: 13, color: "var(--a-fg-2)" }}>Active</span>
        </label>
      </div>

      <div style={{ marginTop: 16 }}>
        <Field label="Explication (affichée après soumission, optionnel)">
          <textarea
            className="a-textarea"
            value={explanation}
            onChange={(e) => {
              setExplanation(e.target.value);
            }}
          />
        </Field>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button
          type="button"
          className="a-btn a-btn--primary"
          style={busyStyle(pending)}
          onClick={submit}
          disabled={pending}
        >
          {pending ? "…" : question ? "Enregistrer" : "Ajouter"}
        </button>
        <button type="button" className="a-btn a-btn--ghost" onClick={onDone}>
          Annuler
        </button>
      </div>
      {error && <p style={errorStyle}>{error}</p>}
    </div>
  );
}
