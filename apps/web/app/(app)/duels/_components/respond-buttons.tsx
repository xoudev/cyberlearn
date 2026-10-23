"use client";

// "use client" justification: the answer is sent from the buttons, then the
// list is read again or the duel opens (router).

import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";
import type { DuelResult } from "@/lib/social/duels";
import { respondToDuelAction } from "../_actions/duel-actions";

/**
 * Accept an invitation (the duel opens) or decline it. Small on the list's
 * invitation cards, large on the duel's own page, where it is the one thing
 * to do.
 */
export function RespondButtons({
  duelId,
  size = "sm",
}: {
  duelId: string;
  size?: "sm" | "lg";
}): React.ReactElement {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // A call that fails inside a transition goes to the nearest error boundary,
  // the site's own, and the invitation with it. It is said under the buttons
  // instead; the page is read again, since the server may have taken the
  // answer before the connection broke.
  const respond = (accept: boolean): void => {
    startTransition(async () => {
      setError(null);
      let result: DuelResult;
      try {
        result = await respondToDuelAction(duelId, accept);
      } catch {
        setError("Réponse non envoyée, réessaie.");
        router.refresh();
        return;
      }
      if (!result.ok) {
        setError(result.error);
        router.refresh();
        return;
      }
      if (accept) router.push(`/duels/${duelId}`);
      else router.refresh();
    });
  };

  const sized = size === "lg" ? "btn--lg" : "btn--sm";
  return (
    <div className="dl-respond">
      <button
        type="button"
        className={`btn btn--accent ${sized}`}
        onClick={() => {
          respond(true);
        }}
        disabled={pending}
      >
        Accepter
      </button>
      <button
        type="button"
        className={`btn btn--ghost ${sized}`}
        onClick={() => {
          respond(false);
        }}
        disabled={pending}
      >
        Refuser
      </button>
      {error !== null ? (
        <p role="alert" className="dl-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
