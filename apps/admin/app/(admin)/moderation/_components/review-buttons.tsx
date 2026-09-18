"use client";

import React, { useState, useTransition } from "react";
import { BAN_DURATIONS } from "@cyberlearn/lib";
import { resolveModerationAction } from "../_actions/moderation-actions";

/**
 * Two decisions, and a sanction that rides along with one of them.
 *
 * The message is already out of sight - the screen took it down when it was
 * written. "Rétablir" says the screen was wrong and puts it back; "Supprimer"
 * says it was right and destroys it. Either way the person is told, which is
 * what makes the queue a conversation rather than a trapdoor.
 *
 * The sanction defaults to none, deliberately. Most confirmed decisions are one
 * clumsy message and deserve nothing beyond the removal. The ones that are not
 * are exactly the ones where making somebody leave the queue, find the account
 * and ban it from there is how it does not get done.
 *
 * Deleting asks first: it cannot be undone, the queue is worked through
 * quickly, and the two buttons sit next to each other.
 */
export function ReviewButtons({ eventId }: { eventId: string }): React.ReactElement {
  const [pending, start] = useTransition();
  const [sanction, setSanction] = useState("none");
  const [failed, setFailed] = useState(false);

  return (
    <div className="a-row-actions" style={{ alignItems: "center", flexWrap: "wrap", gap: 8 }}>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          start(async () => {
            await resolveModerationAction(eventId, "OVERTURNED");
          });
        }}
        className="a-btn a-btn--ghost a-btn--sm"
      >
        Faux positif · rétablir
      </button>

      <select
        className="a-input a-input--sm"
        value={sanction}
        disabled={pending}
        aria-label="Sanction à appliquer"
        onChange={(event) => {
          setSanction(event.target.value);
        }}
      >
        <option value="none">Sans sanction</option>
        {BAN_DURATIONS.map((duration) => (
          <option key={duration.key} value={duration.key}>
            Bannir · {duration.label.toLowerCase()}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const warning =
            sanction === "none"
              ? "Supprimer définitivement ce contenu ? C'est irréversible."
              : "Supprimer définitivement ce contenu et bannir son auteur ? C'est irréversible.";
          if (!window.confirm(warning)) return;
          start(async () => {
            const result = await resolveModerationAction(eventId, "UPHELD", sanction);
            setFailed(result.sanctionFailed === true);
          });
        }}
        className="a-btn a-btn--danger a-btn--sm"
      >
        Confirmer · supprimer
      </button>

      {failed && (
        <span className="a-field-hint" style={{ color: "#FFB547" }}>
          Contenu supprimé. La sanction n&apos;a pas été appliquée : ce compte est déjà banni.
        </span>
      )}
    </div>
  );
}
