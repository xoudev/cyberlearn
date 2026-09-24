import React from "react";
import { GOAL_CHOICES, LEVEL_CHOICES } from "@cyberlearn/lib";
import type { LearningAnswers } from "@/lib/paths/suggestions";
import "./path-guide.css";

/**
 * The two questions: what brings you here (several answers), and where you
 * start from (one). Each choice shows examples, so somebody who does not know
 * the words ("réseau", "SOC") can still recognise what they want.
 *
 * A plain GET form: no script needed, and the answers land in the address,
 * which is what the page reads to suggest.
 */
export function GuideQuestions({
  action,
  answers,
  error,
  submitLabel,
  hidden,
}: {
  action: string;
  answers: Partial<LearningAnswers>;
  error: string | null;
  submitLabel: string;
  /** Extra fields to carry through, e.g. a step marker. */
  hidden?: Record<string, string>;
}): React.ReactElement {
  return (
    <form action={action} method="get">
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

      <button type="submit" className="pg-btn btn-blue">
        {submitLabel} <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
