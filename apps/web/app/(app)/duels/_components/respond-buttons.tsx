"use client";

import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";
import { respondToDuelAction } from "../_actions/duel-actions";

/** Accept an invitation (the duel opens) or decline it. */
export function RespondButtons({ duelId }: { duelId: string }): React.ReactElement {
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

  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button
        type="button"
        className="btn btn--accent btn--sm"
        onClick={() => {
          respond(true);
        }}
        disabled={pending}
      >
        Accepter
      </button>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => {
          respond(false);
        }}
        disabled={pending}
      >
        Refuser
      </button>
      {error !== null ? (
        <span role="alert" style={{ color: "var(--color-danger)", fontSize: 13 }}>
          {error}
        </span>
      ) : null}
    </span>
  );
}
