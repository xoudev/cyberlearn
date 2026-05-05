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
    (_prev: { correct: boolean; error?: string }, formData: FormData) =>
      submitFlagAction(challengeId, (formData.get("flag") as string | null) ?? ""),
    { correct: false },
  );

  const remaining = Math.max(0, maxAttempts - userAttempts);

  if (state.correct) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          padding: "40px 32px",
          background: "rgba(10,255,212,0.04)",
          border: "1px solid rgba(10,255,212,0.25)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(10,255,212,0.12)",
            display: "grid",
            placeItems: "center",
            color: "#0AFFD4",
            boxShadow: "0 0 24px rgba(10,255,212,0.2)",
          }}
        >
          <IconCheck size={24} />
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 16,
              color: "#0AFFD4",
              marginBottom: 6,
            }}
          >
            FLAG CORRECT · CHALLENGE RÉSOLU
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#6B6890" }}>
            XP crédités sur ton profil.
          </div>
        </div>
      </div>
    );
  }

  if (remaining === 0 && userAttempts >= maxAttempts) {
    return (
      <div
        style={{
          padding: "24px 32px",
          background: "rgba(255,77,109,0.04)",
          border: "1px solid rgba(255,77,109,0.2)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "#FF4D6D",
          textAlign: "center",
        }}
      >
        Plus de tentatives disponibles pour ce challenge.
      </div>
    );
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "#6B6890",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {"// SUBMIT FLAG"}
      </div>

      {state.error !== undefined && (
        <div
          style={{
            padding: "10px 14px",
            background: "rgba(255,77,109,0.08)",
            border: "1px solid rgba(255,77,109,0.25)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "#FF4D6D",
          }}
        >
          {state.error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
        <input
          name="flag"
          type="text"
          placeholder="CTF{...}"
          autoComplete="off"
          spellCheck={false}
          required
          style={{
            flex: 1,
            padding: "11px 14px",
            background: "#060420",
            border: "1px solid #2A2560",
            color: "#F5F5FA",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            outline: "none",
            letterSpacing: "0.04em",
          }}
        />
        <button
          type="submit"
          disabled={pending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 24px",
            background: pending ? "#1F1B47" : "#0024FF",
            color: "#fff",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            border: "none",
            cursor: pending ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <IconFlag size={12} />
          {pending ? "Vérification..." : "Soumettre"}
        </button>
      </div>

      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6B6890" }}>
        {remaining} tentative{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""} sur{" "}
        {maxAttempts}
      </div>
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
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "#6B6890",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {"// VALIDATION"}
      </div>

      {state.error !== undefined && (
        <div
          style={{
            padding: "10px 14px",
            background: "rgba(255,77,109,0.08)",
            border: "1px solid rgba(255,77,109,0.25)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "#FF4D6D",
          }}
        >
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "14px 32px",
          background: pending ? "#1F1B47" : "rgba(10,255,212,0.1)",
          color: pending ? "#6B6890" : "#0AFFD4",
          border: `1px solid ${pending ? "#2A2560" : "rgba(10,255,212,0.35)"}`,
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          cursor: pending ? "not-allowed" : "pointer",
          alignSelf: "flex-start",
        }}
      >
        <IconCheck size={14} />
        {pending ? "Enregistrement..." : "Marquer comme complété"}
      </button>

      <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6B6890", margin: 0 }}>
        Sur l&apos;honneur · valide uniquement si tu as réellement résolu le challenge.
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

  const panelStyle: React.CSSProperties = {
    padding: "24px 28px",
    background: "#0A0826",
    border: "1px solid #1F1B47",
  };

  if (displayStatus === "LOCKED") {
    return (
      <div id="challenge-action" style={{ ...panelStyle, borderColor: "rgba(107,104,144,0.4)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "#6B6890",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
          }}
        >
          <IconLock size={16} />
          <span>
            Challenge verrouillé.
            {prerequisiteTitle !== null ? ` Complète d'abord : ${prerequisiteTitle}` : ""}
          </span>
        </div>
      </div>
    );
  }

  if (displayStatus === "COMPLETED") {
    return (
      <div
        id="challenge-action"
        style={{
          ...panelStyle,
          borderColor: "rgba(10,255,212,0.25)",
          background: "rgba(10,255,212,0.03)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "#0AFFD4",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <IconCheck size={16} />
          Challenge résolu · bien joué.
        </div>
      </div>
    );
  }

  return (
    <div id="challenge-action" style={panelStyle}>
      {type === "CTF" ? (
        <FlagForm challengeId={challengeId} maxAttempts={maxAttempts} userAttempts={userAttempts} />
      ) : (
        <CompleteButton challengeId={challengeId} />
      )}
    </div>
  );
}
