import React from "react";
import Link from "next/link";
import { GOAL_CHOICES, LEVEL_CHOICES } from "@cyberlearn/lib";
import { guideQuery, type LearningAnswers } from "@/lib/paths/suggestions";
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

/** "Tu as répondu" and the way back to the questions, answers ticked. */
export function AnswerRecap({
  answers,
  action,
}: {
  answers: LearningAnswers;
  action: string;
}): React.ReactElement {
  const goals = GOAL_CHOICES.filter((c) => answers.goals.includes(c.value)).map((c) => c.label);
  const level = LEVEL_CHOICES.find((c) => c.value === answers.level)?.label ?? "";
  return (
    <p className="pg-recap">
      <b>Tu as répondu</b>
      {goals.join(", ")} · {level}.{" "}
      <Link href={`${action}?${guideQuery(answers, true)}`} className="pg-recap__edit">
        Modifier mes réponses
      </Link>
    </p>
  );
}
