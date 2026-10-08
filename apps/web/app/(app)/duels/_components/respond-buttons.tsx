"use client";

// "use client" justification: the answer is sent from the buttons, then the
// list is read again or the duel opens (router).

import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";
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

  const respond = (accept: boolean): void => {
    startTransition(async () => {
      const result = await respondToDuelAction(duelId, accept);
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
