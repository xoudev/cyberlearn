"use client";

import React, { useTransition } from "react";
import { resolveModerationAction } from "../_actions/moderation-actions";

/**
 * Two buttons, and neither of them changes what was published.
 *
 * "Confirmé" says the filter was right, "Annulé" says it was wrong. The second
 * one is the useful one: it is the only signal that ever tells anybody which
 * rule to change.
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
            await resolveModerationAction(eventId, "UPHELD");
          });
        }}
        className="a-btn a-btn--ghost a-btn--sm"
      >
        Décision confirmée
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          start(async () => {
            await resolveModerationAction(eventId, "OVERTURNED");
          });
        }}
        className="a-btn a-btn--danger a-btn--sm"
      >
        Faux positif
      </button>
    </div>
  );
}
