"use client";

import React, { useState, useTransition } from "react";
import {
  FRIENDSHIP_ACTION_LABEL,
  friendshipAfter,
  friendshipMove,
  type FriendshipView,
} from "@cyberlearn/lib";
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
 * The labels and the moves are the app's too (@cyberlearn/lib/social/friendship).
 */
export function AddFriendButton({
  targetId,
  initialState,
}: {
  targetId: string;
  initialState: FriendshipView;
}): React.JSX.Element {
  const [state, setState] = useState(initialState);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const move = friendshipMove(state);

  return (
    <>
      <button
        type="button"
        className={move === "request" ? "fp-btn fp-btn--primary" : "fp-btn"}
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const result =
              move === "request"
                ? await sendFriendRequestAction(targetId)
                : await removeFriendAction(targetId);
            if (result.ok) setState(friendshipAfter(move, result.becameFriends === true));
            else if (move === "request") setError(result.error ?? "Impossible pour l'instant.");
          });
        }}
      >
        {FRIENDSHIP_ACTION_LABEL[state]}
      </button>
      {error !== null && (
        <span className="fp-error" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
