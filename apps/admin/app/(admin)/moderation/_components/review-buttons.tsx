"use client";

import React, { useTransition } from "react";
import { resolveModerationAction } from "../_actions/moderation-actions";

/**
 * Two buttons, and both of them now decide what happens to the content.
 *
 * The message is already out of sight - the screen took it down when it was
 * written. "Rétablir" says the screen was wrong and puts it back; "Supprimer"
 * says it was right and destroys it. The labels say which, because "Décision
 * confirmée" gives no hint that a row is about to be deleted for good.
 *
 * Deleting asks first. It cannot be undone, the queue is worked through
 * quickly, and the two buttons sit next to each other.
 */
export function ReviewButtons({ eventId }: { eventId: string }): React.ReactElement {
  const [pending, start] = useTransition();

  return (
    <div className="a-row-actions">
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
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Supprimer définitivement ce contenu ? C'est irréversible.")) return;
          start(async () => {
            await resolveModerationAction(eventId, "UPHELD");
          });
        }}
        className="a-btn a-btn--danger a-btn--sm"
      >
        Confirmer · supprimer
      </button>
    </div>
  );
}
