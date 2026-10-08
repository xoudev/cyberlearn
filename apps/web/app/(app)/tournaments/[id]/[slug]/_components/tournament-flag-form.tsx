"use client";

// "use client" justified: the field, the pending state and the answer to a flag.

import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";
import { submitTournamentFlagAction } from "../../../_actions/tournament-actions";
import { IconCheck, IconFlag } from "../../../_components/parts";

/**
 * The flag of a tournament challenge. A right one counts for the player and
 * their team, once; a wrong one costs nothing but a moment, the rate limit
 * standing in for the catalogue's cap on attempts. Drawn as the flag row of
 * the catalogue's Python runner is: the field and its button side by side,
 * the server's answer under them.
 */
export function TournamentFlagForm({
  tournamentId,
  challengeId,
  points,
}: {
  tournamentId: string;
  challengeId: string;
  points: number;
}): React.ReactElement {
  const router = useRouter();
  const [flag, setFlag] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: React.SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    startTransition(async () => {
      const result = await submitTournamentFlagAction({ tournamentId, challengeId, flag });
      if (!result.ok) {
        setMessage({ ok: false, text: result.error });
        return;
      }
      if (!result.correct) {
        setMessage({ ok: false, text: "Ce n'est pas le flag. Essaie encore." });
        return;
      }
      setFlag("");
      setMessage({
        ok: true,
        text: result.already
          ? "Tu avais déjà trouvé ce flag."
          : `Flag accepté : +${String(result.points)} points pour toi et ton équipe.`,
      });
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="trn-flag">
      <div className="trn-flag__head">
        <label htmlFor="tournament-flag" className="trn-flag__label">
          <IconFlag />
          Flag
        </label>
        <span className="trn-flag__pts">{points} points</span>
      </div>
      <div className="trn-flag__row">
        <input
          id="tournament-flag"
          className="trn-flag__input"
          name="flag"
          value={flag}
          onChange={(e) => {
            setFlag(e.target.value);
            setMessage(null);
          }}
          placeholder="CL{...}"
          autoComplete="off"
          spellCheck={false}
          maxLength={500}
          required
          disabled={pending}
        />
        <button type="submit" className="btn btn--danger" disabled={pending || flag.trim() === ""}>
          {pending ? "…" : "Valider"}
        </button>
      </div>
      {message !== null ? (
        <p
          role={message.ok ? "status" : "alert"}
          className="trn-flag__msg"
          data-ok={message.ok ? "true" : "false"}
        >
          {message.ok ? <IconCheck /> : null}
          {message.text}
        </p>
      ) : (
        <p className="trn-flag__hint">Un mauvais flag ne coûte rien.</p>
      )}
    </form>
  );
}
