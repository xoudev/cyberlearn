"use client";

// "use client" justified: wraps the Python runner, itself a client component,
// so that its flag goes to the tournament rather than to the catalogue.

import { useRouter } from "next/navigation";
import React from "react";
import { ScriptRunner } from "@/app/(app)/challenges/[slug]/_components/script-runner";
import { submitTournamentFlagAction } from "../../../_actions/tournament-actions";

/**
 * The catalogue's Python runner, its flag counted by the tournament. A line
 * under it says so while a flag can still be given, the runner's own words
 * being the catalogue's.
 */
export function TournamentScript({
  tournamentId,
  challengeId,
  starterCode,
  solved,
  notice,
}: {
  tournamentId: string;
  challengeId: string;
  starterCode: string;
  solved: boolean;
  /** Why no flag can be given now, when none can. */
  notice: string | null;
}): React.ReactElement {
  const router = useRouter();

  const submitFlag = async (flag: string): Promise<{ correct: boolean; error?: string }> => {
    const result = await submitTournamentFlagAction({ tournamentId, challengeId, flag });
    if (!result.ok) return { correct: false, error: result.error };
    if (!result.correct) return { correct: false, error: "Ce n'est pas le flag. Essaie encore." };
    router.refresh();
    return { correct: true };
  };

  return (
    <div className="trn-script">
      <ScriptRunner
        starterCode={starterCode}
        challengeId={challengeId}
        displayStatus={solved ? "COMPLETED" : "AVAILABLE"}
        // No cap in a tournament: one attempt "left" that never runs out.
        maxAttempts={1}
        userAttempts={0}
        submitFlag={submitFlag}
        {...(notice === null ? {} : { flagNotice: notice })}
      />
      {!solved && notice === null ? (
        <p className="trn-script__note">
          Le flag donné ici compte pour le tournoi, pas pour le catalogue.
        </p>
      ) : null}
    </div>
  );
}
