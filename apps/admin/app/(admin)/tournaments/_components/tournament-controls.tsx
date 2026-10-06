"use client";

// "use client" justified: a confirmation before an action that cannot be undone.

import React, { useState, useTransition } from "react";
import type { TournamentPhase } from "@cyberlearn/lib/challenges/tournament";
import { deleteTournamentAction, endTournamentNowAction } from "../_actions/tournament-actions";

/**
 * What a tournament allows by its phase: deleting one that has not started,
 * ending one that runs. A finished tournament is a record and stays.
 */
export function TournamentControls({
  tournamentId,
  phase,
}: {
  tournamentId: string;
  phase: TournamentPhase;
}): React.ReactElement | null {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (phase === "FINISHED") return null;

  const run = (question: string, act: () => Promise<{ error?: string }>): void => {
    if (!window.confirm(question)) return;
    startTransition(async () => {
      setError(null);
      const result = await act();
      if (result.error !== undefined) setError(result.error);
    });
  };

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      {phase === "UPCOMING" ? (
        <button
          type="button"
          className="a-btn a-btn--danger"
          disabled={pending}
          onClick={() => {
            run("Supprimer ce tournoi ? Ses classes ont déjà reçu l'annonce.", () =>
              deleteTournamentAction(tournamentId),
            );
          }}
        >
          Supprimer
        </button>
      ) : (
        <button
          type="button"
          className="a-btn a-btn--danger"
          disabled={pending}
          onClick={() => {
            run("Terminer le tournoi maintenant ? Les scores s'arrêtent là.", () =>
              endTournamentNowAction(tournamentId),
            );
          }}
        >
          Terminer maintenant
        </button>
      )}
      {error !== null ? <p className="a-form-error">{error}</p> : null}
    </div>
  );
}
