import React from "react";
import { GOAL_CHOICES, LEVEL_CHOICES } from "@cyberlearn/lib/paths/suggest";
import type { LearningAnswers } from "@/lib/paths/guide-answers";
import "./path-guide.css";

/**
 * The two questions: what brings you here (several answers), and where you
 * start from (one). Each choice shows examples, so somebody who does not know
 * the words ("réseau", "SOC") can still recognise what they want.
 *
 * With `action`, a plain GET form: no script needed, and the answers land in
 * the address, which is what the onboarding page reads to suggest. With
 * `onSubmit` instead, the form stays where it is and hands its answers over:
 * the guide's window on the catalogue suggests without leaving the page.
 */
export function GuideQuestions({
  action,
  onSubmit,
  answers,
  error,
  submitLabel,
  hidden,
}: {
  action?: string;
  onSubmit?: (form: FormData) => void;
  answers: Partial<LearningAnswers>;
  error: string | null;
  submitLabel: string;
  /** Extra fields to carry through, e.g. a step marker. */
  hidden?: Record<string, string>;
}): React.ReactElement {
  return (
    <form
      action={action}
      method="get"
      onSubmit={
        onSubmit &&
        ((event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        })
      }
    >
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      {error !== null && (
        <p className="pg-error" role="alert">
          {error}
        </p>
      )}

      <fieldset className="pg-question">
        <legend className="pg-question__legend">Question 1 sur 2</legend>
        <h2 className="pg-question__title">Qu&apos;est-ce qui t&apos;amène ?</h2>
        <p className="pg-question__hint">Coche tout ce qui te parle. Rien n&apos;est définitif.</p>
        <div className="pg-choices">
          {GOAL_CHOICES.map((c) => (
            <label key={c.value} className="pg-choice">
              <input
                className="pg-choice__input"
                type="checkbox"
                name="goals"
                value={c.value}
                defaultChecked={answers.goals?.includes(c.value) ?? false}
              />
              <span className="pg-choice__box" aria-hidden="true" />
              <span>
                <span className="pg-choice__label">{c.label}</span>
                <span className="pg-choice__examples">Par exemple : {c.examples}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="pg-question">
        <legend className="pg-question__legend">Question 2 sur 2</legend>
        <h2 className="pg-question__title">Tu pars d&apos;où ?</h2>
        <p className="pg-question__hint">Pour ne te proposer ni trop facile, ni trop dur.</p>
        <div className="pg-choices">
          {LEVEL_CHOICES.map((c) => (
            <label key={c.value} className="pg-choice">
              <input
                className="pg-choice__input"
                type="radio"
                name="level"
                value={c.value}
                required
                defaultChecked={answers.level === c.value}
              />
              <span className="pg-choice__box" aria-hidden="true" />
              <span>
                <span className="pg-choice__label">{c.label}</span>
                <span className="pg-choice__examples">{c.examples}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" className="btn btn--block btn--lg">
        {submitLabel} <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
