"use client";

import React, { useState, useTransition } from "react";
import { removeFriendAction, sendFriendRequestAction } from "@/app/(app)/_actions/friend-actions";

/**
 * The one thing a visitor can do on somebody else's page.
 *
 * It is the only place a friendship starts: the panel in the navbar answers
 * requests and shows who you know, but adding somebody means having found them,
 * and where you find somebody is their profile.
 *
 * It knows only what the server told it when the page rendered, and says so
 * afterwards rather than guessing - pressing it on somebody who has already
 * asked you turns into being friends, and the label has to be able to say that.
 */
export function AddFriendButton({
  targetId,
  initialState,
}: {
  targetId: string;
  initialState: "none" | "outgoing" | "incoming" | "friends";
}): React.JSX.Element {
  const [state, setState] = useState(initialState);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const undo = (label: string): React.JSX.Element => (
    <button
      type="button"
      className="fp-btn"
      disabled={pending}
      onClick={() => {
        start(async () => {
          const result = await removeFriendAction(targetId);
          if (result.ok) setState("none");
        });
      }}
    >
      {label}
    </button>
  );

  if (state === "friends") return undo("Retirer des amis");
  if (state === "outgoing") return undo("Annuler la demande");

  return (
    <>
      <button
        type="button"
        className="fp-btn fp-btn--primary"
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const result = await sendFriendRequestAction(targetId);
            if (result.ok) setState(result.becameFriends === true ? "friends" : "outgoing");
            else setError(result.error ?? "Impossible pour l'instant.");
          });
        }}
      >
        {state === "incoming" ? "Accepter la demande" : "Ajouter en ami"}
      </button>
      {error !== null && (
        <span className="fp-error" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
