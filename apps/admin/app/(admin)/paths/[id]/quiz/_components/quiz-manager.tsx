"use client";

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

const box: React.CSSProperties = {
  border: "1px solid #2A2560",
  background: "#0A0826",
  padding: 18,
  marginBottom: 18,
};
const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#B8B5D1",
  marginBottom: 4,
};
const input: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  background: "#05041A",
  border: "1px solid #2A2560",
  color: "#F5F5FA",
  fontSize: 13,
  boxSizing: "border-box",
};
const btn = (bg: string): React.CSSProperties => ({
  padding: "8px 16px",
  background: bg,
  color: "#05041A",
  border: "none",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
});
const errText: React.CSSProperties = { color: "#FF4757", fontSize: 12, marginTop: 6 };

export function QuizManager({ path, quiz, questions }: Props): React.JSX.Element {
  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 22, color: "#F5F5FA", marginBottom: 4 }}>Quiz · {path.title}</h1>
      <p style={{ fontSize: 13, color: "#6B6890", marginBottom: 20 }}>
        {"Quiz final qui conditionne l'émission du certificat de ce parcours."}
      </p>

      <SettingsForm path={path} quiz={quiz} />

      {quiz ? (
        <QuestionsSection path={path} quiz={quiz} questions={questions} />
      ) : (
        <p style={{ fontSize: 13, color: "#6B6890" }}>
          {"Enregistre d'abord les réglages pour créer le quiz, puis ajoute des questions."}
        </p>
      )}
    </div>
  );
}

function SettingsForm({
  path,
  quiz,
}: { path: Props["path"]; quiz: Quiz | null }): React.JSX.Element {
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
    <div style={box}>
      <h2 style={{ fontSize: 15, color: "#0AFFD4", marginTop: 0 }}>Réglages</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={label}>Seuil de réussite (%)</label>
          <input
            style={input}
            type="number"
            min={0}
            max={100}
            value={passThreshold}
            onChange={(e) => {
              setPassThreshold(Number(e.target.value));
            }}
          />
        </div>
        <div>
          <label style={label}>Questions tirées par tentative</label>
          <input
            style={input}
            type="number"
            min={1}
            value={questionsToDraw}
            onChange={(e) => {
              setQuestionsToDraw(Number(e.target.value));
            }}
          />
        </div>
      </div>
      <label style={{ ...label, marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => {
            setIsActive(e.target.checked);
          }}
        />
        Quiz actif (requis pour obtenir le certificat)
      </label>

      {!isActive && (
        <p style={{ fontSize: 12, color: "#FFB84D", marginTop: 8 }}>
          {
            "⚠️ Désactivé : plus aucun quiz requis — le certificat sera émis dès que toutes les leçons sont complétées."
          }
        </p>
      )}
      {notReady && (
        <p style={{ fontSize: 12, color: "#FFB84D", marginTop: 8 }}>
          ⚠️ Quiz « non prêt » : {questionsToDraw} questions tirées mais seulement {activeCount}{" "}
          active(s). Les apprenants verront une erreur tant que le pool est insuffisant.
        </p>
      )}

      <div style={{ marginTop: 14 }}>
        <button type="button" style={btn("#0AFFD4")} onClick={save} disabled={pending}>
          {pending ? "Enregistrement…" : quiz ? "Mettre à jour" : "Créer le quiz"}
        </button>
      </div>
      {error && <p style={errText}>{error}</p>}
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 15, color: "#F5F5FA" }}>
          Questions ({questions.length} · {quiz.activeQuestionCount} active(s))
        </h2>
        {!adding && (
          <button
            type="button"
            style={btn("#6E8BFF")}
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
    <div style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 14, color: "#F5F5FA" }}>
          <span style={{ color: "#6B6890" }}>#{question.orderIndex}</span> {question.question}
          {!question.isActive && (
            <span style={{ color: "#FFB84D", marginLeft: 8 }}>(inactive)</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            style={btn("#6E8BFF")}
            onClick={() => {
              setEditing(true);
            }}
          >
            Éditer
          </button>
          <button type="button" style={btn("#FF4757")} onClick={remove} disabled={pending}>
            Suppr.
          </button>
        </div>
      </div>
      <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12.5, color: "#B8B5D1" }}>
        {question.options.map((o) => (
          <li
            key={o.id}
            style={{ color: o.id === question.correctOptionId ? "#0AFFD4" : undefined }}
          >
            {o.id === question.correctOptionId ? "✓ " : ""}
            <b>{o.id}</b> — {o.text}
          </li>
        ))}
      </ul>
      {error && <p style={errText}>{error}</p>}
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
    <div style={{ ...box, borderColor: "#0AFFD4" }}>
      <label style={label}>Question</label>
      <textarea
        style={{ ...input, minHeight: 56 }}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
        }}
      />

      <label style={{ ...label, marginTop: 12 }}>Options (la bonne réponse est cochée)</label>
      {options.map((o, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
          <input
            type="radio"
            name="correct"
            checked={correctOptionId === o.id}
            onChange={() => {
              setCorrectOptionId(o.id);
            }}
            title="Bonne réponse"
          />
          <input
            style={{ ...input, width: 60 }}
            placeholder="id"
            value={o.id}
            onChange={(e) => {
              setOpt(i, { id: e.target.value });
            }}
          />
          <input
            style={input}
            placeholder="Texte de l'option"
            value={o.text}
            onChange={(e) => {
              setOpt(i, { text: e.target.value });
            }}
          />
          {options.length > 2 && (
            <button
              type="button"
              style={btn("#FF4757")}
              onClick={() => {
                removeOpt(i);
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button type="button" style={{ ...btn("#2A2560"), color: "#B8B5D1" }} onClick={addOpt}>
        + Option
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 12 }}>
        <div>
          <label style={label}>Ordre</label>
          <input
            style={input}
            type="number"
            min={0}
            value={orderIndex}
            onChange={(e) => {
              setOrderIndex(Number(e.target.value));
            }}
          />
        </div>
        <label
          style={{ ...label, alignSelf: "end", display: "flex", gap: 8, alignItems: "center" }}
        >
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => {
              setIsActive(e.target.checked);
            }}
          />
          Active
        </label>
      </div>

      <label style={{ ...label, marginTop: 12 }}>
        Explication (affichée après soumission, optionnel)
      </label>
      <textarea
        style={{ ...input, minHeight: 44 }}
        value={explanation}
        onChange={(e) => {
          setExplanation(e.target.value);
        }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button type="button" style={btn("#0AFFD4")} onClick={submit} disabled={pending}>
          {pending ? "…" : question ? "Enregistrer" : "Ajouter"}
        </button>
        <button type="button" style={{ ...btn("#2A2560"), color: "#B8B5D1" }} onClick={onDone}>
          Annuler
        </button>
      </div>
      {error && <p style={errText}>{error}</p>}
    </div>
  );
}
