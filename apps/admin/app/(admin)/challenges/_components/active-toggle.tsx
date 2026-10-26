"use client";

import React, { useState, useOptimistic, useTransition } from "react";
import { notifyResult } from "@/lib/notify";
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
      // A refusal used to be swallowed: the optimistic state went back with
      // no word, and the click looked like it had not registered.
      const ok = notifyResult(res, {
        success: next ? "Challenge activé." : "Challenge désactivé.",
        error: "Le challenge n'a pas pu être modifié.",
      });
      if (ok) setConfirmed(next);
    });
  }

  const color = optimisticActive ? "var(--color-success)" : "var(--a-muted)";

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
        border: `1px solid color-mix(in srgb, ${color} 27%, transparent)`,
        cursor: isPending ? "wait" : "pointer",
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: isPending ? "var(--a-muted)" : color,
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
            background: color,
            flexShrink: 0,
          }}
        />
      )}
      {optimisticActive ? "Actif" : "Inactif"}
    </button>
  );
}
