"use client";

// "use client" justified: the field, the pending state and the answer to a flag.

import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";
import { submitTournamentFlagAction } from "../../../_actions/tournament-actions";

/**
 * The flag of a tournament challenge. A right one counts for the player and
 * their team, once; a wrong one costs nothing but a moment, the rate limit
 * standing in for the catalogue's cap on attempts.
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
    <form
      onSubmit={submit}
      className="card"
      style={{ padding: "16px 20px", display: "grid", gap: 10 }}
    >
      <label
        htmlFor="tournament-flag"
        className="mono-label"
        style={{ color: "var(--color-danger)" }}
      >
        ⚑ Flag · {String(points)} points
      </label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          id="tournament-flag"
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
          style={{
            flex: 1,
            minWidth: 220,
            padding: "10px 12px",
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            background: "var(--color-bg-base)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border-default)",
          }}
        />
        <button type="submit" className="btn btn--danger" disabled={pending || flag.trim() === ""}>
          {pending ? "…" : "Valider"}
        </button>
      </div>
      {message !== null ? (
        <p
          role={message.ok ? "status" : "alert"}
          style={{
            margin: 0,
            color: message.ok ? "var(--cosmetic-accent)" : "var(--color-danger)",
          }}
        >
          {message.text}
        </p>
      ) : null}
    </form>
  );
}
