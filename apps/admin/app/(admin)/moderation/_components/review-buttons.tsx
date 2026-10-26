"use client";

import React, { useState, useTransition } from "react";
import { BAN_DURATIONS } from "@cyberlearn/lib";
import { Select } from "@cyberlearn/ui";
import { toast } from "sonner";
import { resolveModerationAction } from "../_actions/moderation-actions";
import { useReportOutcome } from "./review-outcomes";
import { useAdminConfirmation } from "../../_components/admin-confirmation";

/**
 * What a decision that went exactly as asked did, for its toast. The sanction
 * is not named: the action only says something when one did not apply as
 * asked, and an author it cannot find is not banned either.
 */
function decisionNotice(outcome: "UPHELD" | "OVERTURNED", actionable: boolean): string {
  if (outcome === "OVERTURNED") return actionable ? "Contenu rétabli." : "Faux positif enregistré.";
  return actionable ? "Contenu supprimé." : "Décision enregistrée.";
}

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
 *
 * What a decision came to is said above the queue, not here: see
 * ReviewOutcomes. `about` names the content there, once this row is gone.
 *
 * `sanctionRefusal` is set when the author is not someone the console bans -
 * an administrator, or the moderator themselves - and the ban lengths are
 * then offered greyed out, with the reason under them. The action refuses it
 * too.
 */
export function ReviewButtons({
  eventId,
  actionable,
  about,
  sanctionRefusal,
}: {
  eventId: string;
  actionable: boolean;
  about: string;
  sanctionRefusal: string | null;
}): React.ReactElement {
  const [pending, start] = useTransition();
  const [sanction, setSanction] = useState("none");
  const report = useReportOutcome();
  const confirm = useAdminConfirmation();

  const decide = (outcome: "UPHELD" | "OVERTURNED", chosen?: string): void => {
    start(async () => {
      const result = await resolveModerationAction(eventId, outcome, chosen);
      // A decision with something to say is said above the queue, where it
      // stays. One that went exactly as asked used to say nothing at all: the
      // row simply left. A toast says it was recorded.
      if (result.message !== undefined) report(about, result.message);
      else if (result.ok) toast.success(decisionNotice(outcome, actionable));
    });
  };

  async function confirmDecision(): Promise<void> {
    if (actionable) {
      const warning =
        sanction === "none"
          ? "Supprimer définitivement ce contenu ? C’est irréversible."
          : "Supprimer définitivement ce contenu et bannir son auteur ? C’est irréversible.";
      if (!(await confirm(`${about} : ${warning}`))) return;
    } else if (
      sanction !== "none" &&
      !(await confirm(`${about} : bannir l’auteur ? C’est une sanction.`))
    )
      return;
    decide("UPHELD", sanction);
  }

  return (
    <div className="a-row-actions" style={{ alignItems: "center", flexWrap: "wrap", gap: 8 }}>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          decide("OVERTURNED");
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
            disabled: sanctionRefusal !== null,
          })),
        ]}
        onChange={setSanction}
      />

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          void confirmDecision();
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

      {sanctionRefusal !== null && (
        <span className="a-field-hint">Pas de sanction depuis la file : {sanctionRefusal}</span>
      )}
    </div>
  );
}
