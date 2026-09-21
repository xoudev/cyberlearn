"use client";

import React, { useState, useTransition } from "react";
import { BAN_DURATIONS } from "@cyberlearn/lib";
import { Select } from "@cyberlearn/ui";
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
 *
 * `actionable` is false where the decision reaches no content - a refused note
 * share publishes nothing, so there is nothing to put back and nothing to
 * destroy. The row is still worth closing: the decision is the record, and it
 * is what the author is told and what a sanction hangs off. It just must not
 * be drawn as "rétablir" and "supprimer", which is what it was, and which did
 * nothing at all on that surface while reporting success.
 */
export function ReviewButtons({
  eventId,
  actionable,
}: {
  eventId: string;
  actionable: boolean;
}): React.ReactElement {
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
        {actionable ? "Faux positif · rétablir" : "Faux positif"}
      </button>

      <Select
        block={false}
        value={sanction}
        disabled={pending}
        aria-label="Sanction à appliquer"
        options={[
          { value: "none", label: "Sans sanction" },
          ...BAN_DURATIONS.map((duration) => ({
            value: duration.key,
            label: `Bannir · ${duration.label.toLowerCase()}`,
          })),
        ]}
        onChange={setSanction}
      />

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          // Only the destroying decision asks. Confirming a refusal destroys
          // nothing, so a warning about something irreversible would be a lie
          // and would train people to click through the real one.
          if (actionable) {
            const warning =
              sanction === "none"
                ? "Supprimer définitivement ce contenu ? C'est irréversible."
                : "Supprimer définitivement ce contenu et bannir son auteur ? C'est irréversible.";
            if (!window.confirm(warning)) return;
          } else if (
            sanction !== "none" &&
            !window.confirm("Bannir l'auteur ? C'est une sanction.")
          ) {
            return;
          }
          start(async () => {
            const result = await resolveModerationAction(eventId, "UPHELD", sanction);
            setFailed(result.sanctionFailed === true);
          });
        }}
        className="a-btn a-btn--danger a-btn--sm"
      >
        {actionable ? "Confirmer · supprimer" : "Confirmer"}
      </button>

      {!actionable && (
        <span className="a-field-hint">
          Rien n&apos;a été publié : le partage a été refusé et la note est restée chez son auteur.
          La décision est enregistrée et lui est communiquée.
        </span>
      )}

      {failed && (
        <span className="a-field-hint" style={{ color: "#FFB547" }}>
          Contenu supprimé. La sanction n&apos;a pas été appliquée : ce compte est déjà banni.
        </span>
      )}
    </div>
  );
}
