"use client";

import React, { useState, useTransition } from "react";
import { moderateTopicAction } from "../_actions/forum-actions";

/** Pinning and closing: shown to administrators, refused to everyone else
 *  server-side as well, since a hidden button is not a permission check.
 *
 *  A refusal is said under the buttons. The answer used to be dropped, so a
 *  failed pin looked like a click that had not registered, and got clicked
 *  again. */
export function TopicTools({
  topicId,
  pinned,
  locked,
  path,
}: {
  topicId: string;
  pinned: boolean;
  locked: boolean;
  path: string;
}): React.JSX.Element {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (patch: { pinned?: boolean; locked?: boolean }): void => {
    setError(null);
    start(async () => {
      try {
        const res = await moderateTopicAction({ topicId, path, ...patch });
        if (!res.ok) setError(res.error ?? "Action impossible.");
      } catch {
        setError("Action impossible pour l'instant. Réessaie dans un moment.");
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
      <div className="fo-post-tools">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={pending}
          onClick={() => {
            run({ pinned: !pinned });
          }}
        >
          {pinned ? "Désépingler" : "Épingler"}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={pending}
          onClick={() => {
            run({ locked: !locked });
          }}
        >
          {locked ? "Rouvrir" : "Fermer"}
        </button>
      </div>
      {error !== null && (
        <p className="fo-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
