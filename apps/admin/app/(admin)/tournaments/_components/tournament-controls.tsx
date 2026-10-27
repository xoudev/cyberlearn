"use client";

// "use client" justified: a confirmation before an action that cannot be undone.

import React, { useTransition } from "react";
import { useAdminConfirmation } from "../../_components/admin-confirmation";
import type { TournamentPhase } from "@cyberlearn/lib/challenges/tournament";
import { notifyResult } from "@/lib/notify";
import { deleteTournamentAction, endTournamentNowAction } from "../_actions/tournament-actions";

/**
 * What a tournament allows by its phase: deleting one that has not started,
 * ending one that runs. A finished tournament is a record and stays.
 *
 * What came of it is said in a toast. A deletion that works leaves the page
 * for the list, which says it (see lib/saved-notice.ts), so only its refusal
 * is said from here.
 */
export function TournamentControls({
  tournamentId,
  phase,
}: {
  tournamentId: string;
  phase: TournamentPhase;
}): React.ReactElement | null {
  const [pending, startTransition] = useTransition();
  const confirm = useAdminConfirmation();
  if (phase === "FINISHED") return null;

  const run = async (
    question: string,
    act: () => Promise<{ error?: string }>,
    success?: string,
  ): Promise<void> => {
    if (!(await confirm(`Tournoi ${tournamentId} : ${question}`))) return;
    startTransition(async () => {
      const result = await act();
      notifyResult(result, { success, error: "L'action sur le tournoi a échoué." });
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
            void run("Supprimer ce tournoi ? Ses classes ont déjà reçu l'annonce.", () =>
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
            void run(
              "Terminer le tournoi maintenant ? Les scores s'arrêtent là.",
              () => endTournamentNowAction(tournamentId),
              "Tournoi terminé : les scores sont arrêtés.",
            );
          }}
        >
          Terminer maintenant
        </button>
      )}
    </div>
  );
}
