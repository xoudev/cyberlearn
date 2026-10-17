"use client";

import React, { useActionState } from "react";
import { Select } from "@cyberlearn/ui";
import { keepFormInput } from "@/lib/form-input";
import {
  correctLessonProgressAction,
  resetPlacementAction,
  waiveExamCooldownAction,
  type LearningActionState,
} from "../../../_actions/learning-actions";

/**
 * The corrections the progress panel offers, each behind a confirmation and
 * each saying what it did. Client-side for those two things only; the panel
 * around them is read on the server.
 */

const RADIO_ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: "var(--a-fg-2)",
  cursor: "pointer",
};

function Outcome({ state }: { state: LearningActionState }): React.ReactElement | null {
  if (state.error !== undefined) return <p className="a-form-error">{state.error}</p>;
  if (state.notice === undefined) return null;
  return (
    <>
      <p className="a-form-notice">{state.notice}</p>
      {state.notifyFailed === true && (
        <p className="a-form-error">
          La notification n&apos;a pas pu être envoyée : préviens la personne autrement qu&apos;elle
          peut repasser le test.
        </p>
      )}
    </>
  );
}

/** Removes the placement test's result, so that it can be sat again. */
export function PlacementResetButton({ userId }: { userId: string }): React.ReactElement {
  const [state, action, pending] = useActionState<LearningActionState, FormData>(
    resetPlacementAction,
    {},
  );
  return (
    <div className="a-form" style={{ marginTop: 12 }}>
      <form
        action={action}
        onSubmit={(event) => {
          // Cancelling the native submit also cancels the action.
          if (
            !window.confirm(
              "Remettre le test de positionnement à zéro ? Ses scores sont effacés et les leçons qu'il dispensait se verrouillent de nouveau, sauf celles déjà terminées. Une notification invite la personne à le repasser.",
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="userId" value={userId} />
        <button type="submit" disabled={pending} className="a-btn a-btn--ghost a-btn--sm">
          {pending ? "Remise à zéro…" : "Remettre le test à zéro"}
        </button>
      </form>
      <Outcome state={state} />
    </div>
  );
}

/** Lets the learner sit a path's exam again now. */
export function WaiveCooldownButton({
  userId,
  pathId,
  pathTitle,
}: {
  userId: string;
  pathId: string;
  pathTitle: string;
}): React.ReactElement {
  const [state, action, pending] = useActionState<LearningActionState, FormData>(
    waiveExamCooldownAction,
    {},
  );
  return (
    <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
      <form
        action={action}
        onSubmit={(event) => {
          if (
            !window.confirm(
              `Lever le délai d'attente de l'examen « ${pathTitle} » ? La personne pourra le repasser tout de suite ; sa dernière tentative garde son score.`,
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="pathId" value={pathId} />
        <button type="submit" disabled={pending} className="a-btn a-btn--ghost a-btn--sm">
          {pending ? "Levée…" : "Lever le délai"}
        </button>
      </form>
      <Outcome state={state} />
    </div>
  );
}

/**
 * Corrects one lesson among those the account opened: back to never opened,
 * or finished without anything paid. The two are radio buttons rather than
 * two buttons, so the confirmation can say which one is about to run.
 */
export function LessonCorrectionForm({
  userId,
  lessons,
}: {
  userId: string;
  lessons: { id: string; title: string; status: string }[];
}): React.ReactElement {
  const [state, action, pending] = useActionState<LearningActionState, FormData>(
    correctLessonProgressAction,
    {},
  );

  return (
    <form
      action={action}
      onReset={keepFormInput}
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        const lesson = lessons.find((entry) => entry.id === data.get("lessonId"));
        const mode = data.get("mode");
        if (lesson === undefined || (mode !== "reset" && mode !== "complete")) return;
        const question =
          mode === "reset"
            ? `Remettre à zéro « ${lesson.title} » ? Sa progression, ses réponses aux quiz et ses cartes de révision sont effacées ; l'XP déjà gagnée reste.`
            : `Marquer « ${lesson.title} » terminée ? Sans XP, sans série et sans badge.`;
        if (!window.confirm(question)) event.preventDefault();
      }}
      className="a-form"
    >
      <input type="hidden" name="userId" value={userId} />

      <label className="a-field">
        <span className="a-label">Leçon</span>
        <Select
          name="lessonId"
          required
          defaultValue=""
          placeholder="Choisir une leçon commencée…"
          aria-label="Leçon à corriger"
          options={lessons.map((lesson) => ({
            value: lesson.id,
            label: `${lesson.title} · ${lesson.status}`,
          }))}
        />
      </label>

      <fieldset className="a-field" style={{ border: "none", padding: 0, margin: 0 }}>
        <legend className="a-label">Correction</legend>
        <label style={RADIO_ROW}>
          <input type="radio" name="mode" value="reset" defaultChecked />
          Remettre à zéro, comme jamais ouverte
        </label>
        <label style={RADIO_ROW}>
          <input type="radio" name="mode" value="complete" />
          Marquer terminée, sans XP
        </label>
      </fieldset>

      <button type="submit" disabled={pending} className="a-btn a-btn--ghost">
        {pending ? "Correction…" : "Corriger la leçon"}
      </button>
      <Outcome state={state} />
    </form>
  );
}
