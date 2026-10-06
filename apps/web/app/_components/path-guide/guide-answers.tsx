import React from "react";
import Link from "next/link";
import { GOAL_CHOICES, LEVEL_CHOICES } from "@cyberlearn/lib/paths/suggest";
import { guideQuery, type LearningAnswers } from "@/lib/paths/guide-answers";
import "./path-guide.css";

/** The answers, carried by a form that acts on them. */
export function AnswerFields({ answers }: { answers: LearningAnswers }): React.ReactElement {
  return (
    <>
      {answers.goals.map((goal) => (
        <input key={goal} type="hidden" name="goals" value={goal} />
      ))}
      <input type="hidden" name="level" value={answers.level} />
    </>
  );
}

/**
 * "Tu as répondu" and the way back to the questions, answers ticked: a link
 * to the page's address with `action`, a button that calls `onEdit` in the
 * guide's window.
 */
export function AnswerRecap({
  answers,
  action,
  onEdit,
}: {
  answers: LearningAnswers;
  action?: string;
  onEdit?: () => void;
}): React.ReactElement {
  const goals = GOAL_CHOICES.filter((c) => answers.goals.includes(c.value)).map((c) => c.label);
  const level = LEVEL_CHOICES.find((c) => c.value === answers.level)?.label ?? "";
  return (
    <p className="pg-recap">
      <b>Tu as répondu</b>
      {goals.join(", ")} · {level}.{" "}
      {onEdit ? (
        <button type="button" className="pg-recap__edit" onClick={onEdit}>
          Modifier mes réponses
        </button>
      ) : (
        <Link href={`${action ?? ""}?${guideQuery(answers, true)}`} className="pg-recap__edit">
          Modifier mes réponses
        </Link>
      )}
    </p>
  );
}
