"use client";

// "use client" justified: useActionState for flag submission and completion

import React, { useActionState } from "react";
import { submitFlagAction, completeChallengeAction } from "../../_actions/challenge-actions";

interface Props {
  challengeId: string;
  type: "CTF" | "PUZZLE" | "LAB" | "SCRIPT";
  displayStatus: "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";
  maxAttempts: number;
  userAttempts: number;
  prerequisiteTitle: string | null;
}

// ── Icon helpers ──────────────────────────────────────────────────────────────

function IconFlag({ size = 14 }: { size?: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 2 V14 M3 2 L13 5 L3 8" />
    </svg>
  );
}

function IconCheck({ size = 14 }: { size?: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 8 L6.5 12 L13.5 4" />
    </svg>
  );
}

function IconLock({ size = 14 }: { size?: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="7" width="10" height="7" rx="1" />
      <path d="M5 7 V5 C5 3 6 2 8 2 C10 2 11 3 11 5 V7" />
    </svg>
  );
}

// ── Flag submission (CTF) ─────────────────────────────────────────────────────

function FlagForm({
  challengeId,
  maxAttempts,
  userAttempts,
}: {
  challengeId: string;
  maxAttempts: number;
  userAttempts: number;
}): React.ReactElement {
  const [state, action, pending] = useActionState(
    (_prev: { correct: boolean; error?: string; xpEarned?: number }, formData: FormData) => {
      const flag = formData.get("flag");
      return submitFlagAction(challengeId, typeof flag === "string" ? flag : "");
    },
    { correct: false },
  );

  const remaining = Math.max(0, maxAttempts - userAttempts);

  if (state.correct) {
    return (
      <div className="challenge-solved">
        <span className="challenge-solved__mark" aria-hidden="true">
          <IconCheck size={22} />
        </span>
        <div>
          <p className="challenge-solved__title">Flag correct, défi résolu.</p>
          <p className="challenge-solved__xp">
            {state.xpEarned !== undefined
              ? `+${String(state.xpEarned)} XP crédités sur ton profil.`
              : "XP crédités sur ton profil."}
          </p>
        </div>
      </div>
    );
  }

  if (remaining === 0 && userAttempts >= maxAttempts) {
    return <p className="challenge-alert">Plus de tentatives disponibles pour ce défi.</p>;
  }

  return (
    <form action={action} className="challenge-form">
      <label htmlFor="challenge-flag" className="challenge-form__label">
        Flag trouvé
      </label>

      {state.error !== undefined && (
        <p role="alert" className="challenge-alert">
          {state.error}
        </p>
      )}

      <div className="challenge-flag-row">
        <input
          id="challenge-flag"
          name="flag"
          type="text"
          placeholder="CTF{...}"
          aria-label="Flag du défi"
          autoComplete="off"
          spellCheck={false}
          required
        />
        <button className="btn" type="submit" disabled={pending}>
          <IconFlag size={14} />
          {pending ? "Vérification…" : "Soumettre"}
        </button>
      </div>

      <p className="challenge-form__meta">
        {remaining} tentative{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""} sur{" "}
        {maxAttempts}
      </p>
    </form>
  );
}

// ── Complete button (PUZZLE / LAB) ────────────────────────────────────────────

function CompleteButton({ challengeId }: { challengeId: string }): React.ReactElement {
  const [state, action, pending] = useActionState(
    async () => completeChallengeAction(challengeId),
    {},
  );

  return (
    <form action={action} className="challenge-form">
      {state.error !== undefined && <p className="challenge-alert">{state.error}</p>}

      <button className="btn" type="submit" disabled={pending}>
        <IconCheck size={14} />
        {pending ? "Enregistrement…" : "Marquer comme complété"}
      </button>

      <p className="challenge-form__meta">
        Sur l&apos;honneur : valide uniquement si tu as réellement résolu le défi.
      </p>
    </form>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function ChallengeAction({
  challengeId,
  type,
  displayStatus,
  maxAttempts,
  userAttempts,
  prerequisiteTitle,
}: Props): React.ReactElement | null {
  // SCRIPT type: flag submission is handled inline inside ScriptRunner
  if (type === "SCRIPT") return null;

  if (displayStatus === "LOCKED") {
    return (
      <div id="challenge-action" className="challenge-panel">
        <p className="challenge-panel__status">
          <IconLock size={16} />
          <span>
            Défi verrouillé.
            {prerequisiteTitle !== null ? ` Complète d'abord : ${prerequisiteTitle}` : ""}
          </span>
        </p>
      </div>
    );
  }

  if (displayStatus === "COMPLETED") {
    return (
      <div id="challenge-action" className="challenge-panel">
        <p className="challenge-panel__status challenge-panel__status--done">
          <IconCheck size={16} />
          Défi résolu · bien joué.
        </p>
      </div>
    );
  }

  return (
    <div id="challenge-action" className="challenge-panel">
      {type === "CTF" ? (
        <FlagForm challengeId={challengeId} maxAttempts={maxAttempts} userAttempts={userAttempts} />
      ) : (
        <CompleteButton challengeId={challengeId} />
      )}
    </div>
  );
}
