"use client";

// "use client" justification: a window over the page, opened and closed by
// the address in the browser; each answer is sent as it is picked and its
// verdict shown in place.

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ModalShell } from "@cyberlearn/ui";
import { rightAnswersWord } from "@cyberlearn/lib/social/duel";
import type { QueryDialogProps } from "@/hooks/use-query-dialog";
import type {
  RecallQuestion,
  RecallResult,
  RecallVerdict,
  RecallView,
} from "@/lib/revisions/daily-recall";
import {
  answerDailyRecallAction,
  answerModuleReviewAction,
  openDailyRecallAction,
  openModuleReviewAction,
} from "@/app/(app)/_rappel/_actions/rappel-actions";
import { parseRappelValue, type RappelRequest } from "./rappel-query";
import "./rappel.css";

/**
 * "Rappel du jour" and "Réviser ce module", in a window over the page
 * (?rappel=, registered in components/query-dialogs.ts).
 *
 * One question at a time. The answer is checked on the server and final; the
 * window then says whether it was right, which option was, why (the
 * explanation the author wrote) and leads back to the passage of the lesson.
 * The day's recall keeps its answers on the server: closed halfway, it opens
 * again on the next question, and the last answer hands it in for its XP. A
 * module's review is a free run, without XP, kept nowhere.
 *
 * The window never says how many questions wait beyond today's: only where
 * the reader is in the few asked now.
 */

const KEYS = ["A", "B", "C", "D", "E", "F", "G", "H"];

const LOAD_FAILED = "Chargement impossible. Réessaie dans un moment.";
const SEND_FAILED = "Envoi impossible. Réessaie dans un moment.";

/** The first question without an answer, by drawn index; null once all have one. */
function firstOpen(
  questions: readonly RecallQuestion[],
  verdicts: readonly RecallVerdict[],
): number | null {
  const answered = new Set(verdicts.map((verdict) => verdict.index));
  return questions.find((q) => !answered.has(q.index))?.index ?? null;
}

function IconCheck(): React.JSX.Element {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8.5 6.5 12 13 4.5" />
    </svg>
  );
}

function IconCross(): React.JSX.Element {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

/** A square a question: right, missed, on screen, or still to answer. Decorative. */
function Pips({
  questions,
  verdicts,
  current,
}: {
  questions: readonly RecallQuestion[];
  verdicts: readonly RecallVerdict[];
  current: number | null;
}): React.JSX.Element {
  const byIndex = new Map(verdicts.map((verdict) => [verdict.index, verdict]));
  return (
    <span className="rp-pips" aria-hidden="true">
      {questions.map((q) => {
        const verdict = byIndex.get(q.index);
        const state =
          verdict === undefined
            ? q.index === current
              ? "current"
              : "todo"
            : verdict.correct
              ? "right"
              : "wrong";
        return <span key={q.index} className="rp-pip" data-state={state} />;
      })}
    </span>
  );
}

/** What the answer was: right or not, the right option, why, and the way back to the lesson. */
function Verdict({
  verdict,
  question,
}: {
  verdict: RecallVerdict;
  question: RecallQuestion;
}): React.JSX.Element {
  const right = question.options[verdict.correctIndex];
  return (
    <div className="rp-verdict" data-correct={verdict.correct ? "true" : "false"}>
      <span className="rp-verdict__mark" aria-hidden="true">
        {verdict.correct ? <IconCheck /> : <IconCross />}
      </span>
      <div className="rp-verdict__body">
        <p className="rp-verdict__title">
          {verdict.correct
            ? "Bonne réponse."
            : `Raté. La bonne réponse : ${right ?? KEYS[verdict.correctIndex] ?? ""}.`}
        </p>
        {verdict.explanation !== null && <p className="rp-verdict__why">{verdict.explanation}</p>}
        {verdict.passage !== null && (
          <Link href={verdict.passage.href} className="rp-link">
            Revoir ce passage <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
    </div>
  );
}

/** The question on screen, its options, and once answered, the verdict. */
function Question({
  question,
  verdict,
  position,
  total,
  pending,
  onAnswer,
}: {
  question: RecallQuestion;
  verdict: RecallVerdict | null;
  position: number;
  total: number;
  pending: boolean;
  onAnswer: (selected: number) => void;
}): React.JSX.Element {
  const questionId = `rp-q-${String(question.index)}`;
  return (
    <div className="rp-question">
      <p className="rp-question__eyebrow">
        Question {position} sur {total}
        <span>{question.lessonTitle}</span>
      </p>
      <p id={questionId} className="rp-question__text">
        {question.question}
      </p>
      <div className="rp-options" role="group" aria-labelledby={questionId}>
        {question.options.map((option, k) => {
          const state =
            verdict === null
              ? undefined
              : k === verdict.correctIndex
                ? "right"
                : k === verdict.selected
                  ? "wrong"
                  : "idle";
          return (
            <button
              // SAFETY: the options of one question do not reorder while it is shown.
              key={k}
              type="button"
              className="rp-option"
              data-state={state}
              aria-pressed={verdict !== null && k === verdict.selected}
              disabled={verdict !== null || pending}
              onClick={() => {
                onAnswer(k);
              }}
            >
              <span className="rp-option__key" aria-hidden="true">
                {KEYS[k] ?? String(k + 1)}
              </span>
              <span className="rp-option__text">{option}</span>
            </button>
          );
        })}
      </div>
      <div aria-live="polite">
        {verdict !== null && <Verdict verdict={verdict} question={question} />}
      </div>
    </div>
  );
}

/** The end: how it went, the XP when there is some, and each question with the way back to it. */
function End({
  mode,
  result,
  questions,
  verdicts,
}: {
  mode: RecallView["mode"];
  result: RecallResult;
  questions: readonly RecallQuestion[];
  verdicts: readonly RecallVerdict[];
}): React.JSX.Element {
  const byIndex = new Map(questions.map((q) => [q.index, q]));
  return (
    <div className="rp-end">
      <div className="rp-end__head" role="status">
        {result.xp > 0 && <p className="rp-end__xp">+{result.xp} XP</p>}
        <p className="rp-end__score">
          <b>{result.correct}</b> {rightAnswersWord(result.correct)} sur {result.total}
        </p>
        <p className="rp-end__note">
          {mode === "daily"
            ? "Les questions ratées reviennent demain, les autres de plus en plus tard. Le rappel compte pour ta série."
            : "Une révision libre, sans XP : c'est le rappel du jour qui en rapporte."}
        </p>
      </div>
      {verdicts.length > 0 && (
        <ol className="rp-end__list">
          {verdicts.map((verdict) => {
            const question = byIndex.get(verdict.index);
            if (question === undefined) return null;
            return (
              <li
                key={verdict.index}
                className="rp-end__row"
                data-correct={verdict.correct ? "true" : "false"}
              >
                <span className="rp-end__mark" aria-hidden="true">
                  {verdict.correct ? <IconCheck /> : <IconCross />}
                </span>
                <div>
                  <p className="rp-end__lesson">{question.lessonTitle}</p>
                  <p className="rp-end__q">
                    <span className="sr-only">{verdict.correct ? "Juste : " : "Raté : "}</span>
                    {question.question}
                  </p>
                  {!verdict.correct && verdict.passage !== null && (
                    <Link href={verdict.passage.href} className="rp-link">
                      Revoir ce passage <span aria-hidden="true">→</span>
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function RappelWindow({ value, onClose }: QueryDialogProps): React.JSX.Element {
  const request: RappelRequest = useMemo(() => parseRappelValue(value), [value]);
  const [view, setView] = useState<RecallView | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [verdicts, setVerdicts] = useState<RecallVerdict[]>([]);
  const [result, setResult] = useState<RecallResult | null>(null);
  /** The question on screen, by drawn index; null at the end. */
  const [current, setCurrent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  /**
   * The question an answer was refused on, to show again once the day's
   * recall is read back, if it is still there: answered elsewhere, it comes
   * back with that answer's verdict.
   */
  const refusedOn = useRef<number | null>(null);

  useEffect(() => {
    let live = true;
    const load =
      request.kind === "module"
        ? openModuleReviewAction({ path: request.path, module: request.module })
        : openDailyRecallAction();
    load.then(
      (next) => {
        if (!live) return;
        const kept = refusedOn.current;
        refusedOn.current = null;
        setFailed(false);
        setView(next);
        setVerdicts(next.verdicts);
        setResult(next.result);
        setCurrent(
          kept !== null && next.questions.some((q) => q.index === kept)
            ? kept
            : firstOpen(next.questions, next.verdicts),
        );
      },
      () => {
        if (live) setFailed(true);
      },
    );
    return () => {
      live = false;
    };
  }, [request, attempt]);

  const questions = view?.questions ?? [];
  const question = questions.find((q) => q.index === current) ?? null;
  const verdict = verdicts.find((v) => v.index === current) ?? null;
  const next = firstOpen(questions, verdicts);
  /** A module's review keeps its tally here: nothing is handed in. */
  const moduleResult: RecallResult | null =
    view?.mode === "module" && questions.length > 0 && next === null
      ? {
          correct: verdicts.filter((v) => v.correct).length,
          total: verdicts.length,
          xp: 0,
        }
      : null;
  const ended = current === null && (result ?? moduleResult) !== null;

  const answer = (selected: number): void => {
    if (view === null || question === null) return;
    setError(null);
    start(async () => {
      try {
        const res =
          view.mode === "module" && view.module !== null
            ? await answerModuleReviewAction({
                path: view.module.path,
                module: view.module.number,
                day: view.day,
                index: question.index,
                lessonId: question.lessonId,
                quizId: question.quizId,
                selected,
              })
            : await answerDailyRecallAction({ index: question.index, selected });
        if (!res.ok) {
          setError(res.error);
          if (view.mode === "daily") {
            // Refused for what the server knows and this window does not:
            // answered in another tab or on the phone, gone from its lesson,
            // a day old, the recall handed in or switched off. Read back, the
            // recall shows it: that answer's verdict, the next question,
            // today's recall, the end.
            refusedOn.current = question.index;
            setAttempt((n) => n + 1);
            return;
          }
          // A module's review keeps nothing to read back: the question that
          // could not be checked is set aside, and the review goes on.
          const left = view.questions.filter((q) => q.index !== question.index);
          setView({ ...view, status: left.length === 0 ? "empty" : view.status, questions: left });
          setCurrent(firstOpen(left, verdicts));
          return;
        }
        setVerdicts((prev) => [...prev.filter((v) => v.index !== res.verdict.index), res.verdict]);
        if (res.result !== null) setResult(res.result);
      } catch {
        setError(SEND_FAILED);
      }
    });
  };

  const goOn = (): void => {
    setError(null);
    if (next !== null) {
      setCurrent(next);
      return;
    }
    // Every question answered. The day's recall was handed in by the last
    // answer, here or in another tab: read it back if this tab missed it.
    setCurrent(null);
    if (view?.mode === "daily" && result === null) setAttempt((n) => n + 1);
  };

  const daily = request.kind === "daily";
  const eyebrow = daily ? "Révisions" : "Réviser ce module";
  const title = view?.title ?? (daily ? "Rappel du jour" : "Réviser ce module");
  const meta = daily
    ? "Quelques questions de tes leçons, deux minutes. Tes réponses sont gardées : tu peux reprendre plus tard."
    : "Six questions au plus sur les leçons faites de ce module, sans XP.";

  let body: React.ReactNode;
  let actions: React.ReactNode = (
    <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={pending}>
      Fermer
    </button>
  );

  if (failed) {
    body = (
      <p className="cls-alert" data-tone="bad" role="alert">
        {LOAD_FAILED}
      </p>
    );
    actions = (
      <>
        {actions}
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => {
            setFailed(false);
            setAttempt((n) => n + 1);
          }}
        >
          Réessayer
        </button>
      </>
    );
  } else if (view === null) {
    body = (
      <p className="rp-quiet" role="status">
        Chargement…
      </p>
    );
  } else if (view.status === "off") {
    body = (
      <div className="rp-quiet">
        <p>La répétition espacée est coupée dans tes réglages : aucune question ne revient.</p>
        <Link href="/settings/preferences" className="rp-link">
          Ouvrir les préférences <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  } else if (view.status === "missing") {
    body = <p className="rp-quiet">Ce module n&apos;est pas disponible.</p>;
  } else if (view.status === "empty") {
    body = (
      <p className="rp-quiet">
        {view.mode === "daily"
          ? "Rien à revoir aujourd'hui. Une question ratée dans une leçon revient ici le lendemain, puis de plus en plus tard tant que tu y réponds juste."
          : "Rien à réviser dans ce module pour l'instant : ses questions arrivent ici quand tu as terminé une de ses leçons."}
      </p>
    );
  } else if (ended) {
    body = (
      <End
        mode={view.mode}
        result={result ?? moduleResult ?? { correct: 0, total: 0, xp: 0 }}
        questions={questions}
        verdicts={verdicts}
      />
    );
  } else if (question !== null) {
    const position = questions.findIndex((q) => q.index === question.index) + 1;
    body = (
      <>
        <Pips questions={questions} verdicts={verdicts} current={current} />
        <Question
          question={question}
          verdict={verdict}
          position={position}
          total={questions.length}
          pending={pending}
          onAnswer={answer}
        />
        {error !== null && (
          <p className="cls-alert" data-tone="bad" role="alert">
            {error}
          </p>
        )}
      </>
    );
    if (verdict !== null) {
      actions = (
        <>
          {actions}
          <button type="button" className="btn btn--sm" onClick={goOn}>
            {next === null ? "Voir le bilan" : "Question suivante"}
          </button>
        </>
      );
    }
  } else {
    // Every answer given, the hand-in being read back.
    body = (
      <p className="rp-quiet" role="status">
        Chargement…
      </p>
    );
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      eyebrow={eyebrow}
      title={title}
      meta={view?.status === "open" || view === null ? meta : undefined}
      maxWidth={640}
      dismissable={!pending}
      actions={actions}
      className="rp-window"
    >
      <div className="rp">{body}</div>
    </ModalShell>
  );
}

/** The window, drawn afresh when the address asks for another review. */
export default function RappelDialog({ value, onClose }: QueryDialogProps): React.JSX.Element {
  return <RappelWindow key={value} value={value} onClose={onClose} />;
}
