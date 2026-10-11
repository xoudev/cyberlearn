"use client";

import React, { useState, useTransition } from "react";
import {
  FRIENDSHIP_ACTION_LABEL,
  friendshipAfter,
  friendshipMove,
  friendshipMoveAsksFirst,
  unfriendQuestion,
  type FriendshipView,
} from "@cyberlearn/lib";
import { removeFriendAction, sendFriendRequestAction } from "@/app/(app)/_actions/friend-actions";
import { ConfirmButton } from "@/components/confirm-button";

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
 * The labels and the moves are the app's too (@cyberlearn/lib/social/friendship).
 *
 * "Retirer des amis" asks first, in place: nobody is told, and undoing it
 * takes a new request the other person has to accept. Whatever the move, a
 * refusal is said under the button rather than leaving it as it was.
 */
export function AddFriendButton({
  targetId,
  name,
  initialState,
}: {
  targetId: string;
  /** Who the question names before a friendship ends. */
  name: string;
  initialState: FriendshipView;
}): React.JSX.Element {
  const [state, setState] = useState(initialState);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const move = friendshipMove(state);

  const run = (): void => {
    setError(null);
    start(async () => {
      try {
        const result =
          move === "request"
            ? await sendFriendRequestAction(targetId)
            : await removeFriendAction(targetId);
        if (result.ok) setState(friendshipAfter(move, result.becameFriends === true));
        else setError(result.error ?? "Impossible pour l'instant.");
      } catch {
        setError("Impossible pour l'instant. Réessaie dans un moment.");
      }
    });
  };

  return (
    <>
      <ConfirmButton
        className={move === "request" ? "btn btn--accent btn--sm" : "btn btn--ghost btn--sm"}
        ask={friendshipMoveAsksFirst(state)}
        pending={pending}
        question={unfriendQuestion(name)}
        confirmLabel="Retirer"
        onConfirm={run}
      >
        {FRIENDSHIP_ACTION_LABEL[state]}
      </ConfirmButton>
      {error !== null && (
        <span className="fp-error" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
