"use client";

import React, { useState, useOptimistic, useTransition } from "react";
import { setChallengeActiveAction } from "../_actions/challenge-admin-actions";

export function ActiveToggle({
  challengeId,
  isActive,
}: {
  challengeId: string;
  isActive: boolean;
}): React.JSX.Element {
  const [isPending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(isActive);
  const [optimisticActive, setOptimisticActive] = useOptimistic(confirmed);

  function handleToggle() {
    const next = !optimisticActive;
    startTransition(async () => {
      setOptimisticActive(next);
      const res = await setChallengeActiveAction(challengeId, next);
      if (!res.error) {
        setConfirmed(next);
      }
    });
  }

  const color = optimisticActive ? "#0AFFD4" : "#6B6890";

  return (
    <button
      type="button"
      title={optimisticActive ? "Désactiver le challenge" : "Activer le challenge"}
      disabled={isPending}
      onClick={handleToggle}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px",
        background: "transparent",
        border: `1px solid ${color}44`,
        cursor: isPending ? "wait" : "pointer",
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: isPending ? "#44406B" : color,
        whiteSpace: "nowrap",
        transition: "all 120ms ease",
      }}
    >
      {isPending ? (
        <span style={{ display: "inline-block", animation: "spin 0.8s linear infinite" }}>⟳</span>
      ) : (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: color,
            boxShadow: optimisticActive ? "0 0 6px rgba(10,255,212,0.5)" : "none",
            flexShrink: 0,
          }}
        />
      )}
      {optimisticActive ? "Actif" : "Inactif"}
    </button>
  );
}
