"use client";

// Local answer selection and the server action result update this form.
import React, { useActionState, useState } from "react";
import Link from "next/link";
import { submitPlacementTest, type PlacementActionState } from "../_actions/submit-placement";
import {
  PLACEMENT_CATEGORY_LABEL,
  PLACEMENT_COPY,
  PLACEMENT_DIFFICULTY_LABEL,
  isPlacementCategory,
} from "@cyberlearn/lib/onboarding/placement";
import type { PlacementQuestionView as PlacementQuestion } from "@/lib/onboarding/placement";

interface PlacementTestFormProps {
  questions: PlacementQuestion[];
  estimatedMinutes: number;
}
const initialState: PlacementActionState = { success: false };

export function PlacementTestForm({
  questions,
  estimatedMinutes,
}: PlacementTestFormProps): React.ReactElement {
  const [state, formAction, isPending] = useActionState(submitPlacementTest, initialState);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const grouped = questions.reduce<Record<string, PlacementQuestion[]>>((acc, question) => {
    (acc[question.category] ??= []).push(question);
    return acc;
  }, {});
  const totalAnswered = Object.keys(selected).length;

  return (
    <div>
      <h1 className="ob-shell__title">Où en es-tu ?</h1>
      <p className="ob-shell__lede">
        Quelques questions pour situer ton point de départ. Aucun XP n’est attribué, ce test sert à
        t’orienter.
      </p>
      <dl className="ob-facts">
        <div>
          <dt>Questions</dt>
          <dd>{questions.length}</dd>
        </div>
        <div>
          <dt>Durée estimée</dt>
          <dd>
            {estimatedMinutes} <small>min</small>
          </dd>
        </div>
      </dl>
      <p className="ob-note">{PLACEMENT_COPY.waiverNote} Tu peux passer ce test à tout moment.</p>
      <form action={formAction}>
        {state.message && (
          <p className="ob-error" role="alert">
            {state.message}
          </p>
        )}
        {Object.entries(grouped).map(([category, categoryQuestions]) => (
          <section
            className="ob-placement-group"
            key={category}
            aria-labelledby={`domain-${category}`}
          >
            <div className="ob-placement-group__head">
              <h2 id={`domain-${category}`}>
                {isPlacementCategory(category) ? PLACEMENT_CATEGORY_LABEL[category] : category}
              </h2>
              <span>
                {categoryQuestions.length} question{categoryQuestions.length > 1 ? "s" : ""}
              </span>
            </div>
            {categoryQuestions.map((question) => (
              <fieldset className="ob-placement-question" key={question.id} disabled={isPending}>
                <legend>
                  <span className="ob-placement-question__meta">
                    Question {questions.indexOf(question) + 1} ·{" "}
                    {PLACEMENT_DIFFICULTY_LABEL[question.difficulty] ?? question.difficulty}
                  </span>
                  <span className="ob-placement-question__text">{question.question}</span>
                </legend>
                <div className="ob-placement-options">
                  {question.options.map((option) => (
                    <label className="ob-placement-option" key={option.id}>
                      <input
                        type="radio"
                        name={`answer_${question.id}`}
                        value={option.id}
                        required
                        checked={selected[question.id] === option.id}
                        onChange={() => {
                          setSelected((previous) => ({ ...previous, [question.id]: option.id }));
                        }}
                      />
                      <span className="ob-placement-option__mark" aria-hidden="true" />
                      <span>{option.text}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </section>
        ))}
        <div className="ob-shell__actions">
          <p className="ob-answer-count" role="status">
            {totalAnswered} / {questions.length} réponses
          </p>
          <button
            className="btn btn--lg btn--block"
            type="submit"
            disabled={isPending || questions.length === 0}
          >
            {isPending ? "Validation en cours…" : "Valider le test"}
          </button>
          <Link className="ob-shell__link" href="/dashboard">
            Passer et aller au tableau de bord
          </Link>
        </div>
      </form>
    </div>
  );
}
