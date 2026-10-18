"use client";

// "use client" justification: the button sends the request and says how it
// went in place, on a list (a class, the leaderboard) the server drew.

import React, { useState, useTransition } from "react";
import {
  sendFriendRequestAction,
  sendFriendRequestByHandleAction,
  type FriendActionResult,
} from "@/app/(app)/_actions/friend-actions";
import { FriendMark } from "@/components/friend-mark";
import {
  REQUEST_SENT_LABEL,
  ROW_FRIEND_LABEL,
  rowFriendAction,
  rowFriendActionName,
  type FriendshipView,
} from "@cyberlearn/lib/social/friendship";

/**
 * "Ajouter" beside somebody on a list that is not about friends: a classmate,
 * a public line of the leaderboard. One button that asks, or that agrees when
 * they asked first (rowFriendAction): the rest - taking a request back,
 * refusing one, ending a friendship - belongs to the friends panel and the
 * profile, where the person is in front of you.
 *
 * Once a request is on its way it says so ("Demande envoyée"); once the two
 * are friends it becomes the friend mark. A refusal from the server is said
 * beside the button, which stays to try again.
 *
 * The leaderboard's rows carry no id, by choice (leaderboard.visibility.ts):
 * there the request goes by the handle the row shows, and the server finds
 * the id only among the players that board names.
 */
export function AddFriendChip({
  target,
  name,
  view,
}: {
  target: { id: string } | { username: string };
  /** Who it is, for the button's name on a screen reader. */
  name: string;
  /** Where the reader stands with them, as the server read it. */
  view: FriendshipView;
}): React.JSX.Element | null {
  const [state, setState] = useState<FriendshipView>(view);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (state === "friends") return <FriendMark size={12} className="add-friend-mark" />;
  if (state === "outgoing") {
    return <span className="add-friend-sent">{REQUEST_SENT_LABEL}</span>;
  }
  const action = rowFriendAction(state);
  if (action === null) return null;

  const send = (): void => {
    setError(null);
    start(async () => {
      let result: FriendActionResult;
      try {
        result =
          "id" in target
            ? await sendFriendRequestAction(target.id)
            : await sendFriendRequestByHandleAction(target.username);
      } catch {
        setError("Impossible pour l'instant.");
        return;
      }
      if (!result.ok) {
        setError(result.error ?? "Impossible pour l'instant.");
        return;
      }
      setState(result.becameFriends === true ? "friends" : "outgoing");
    });
  };

  return (
    <span className="add-friend">
      <button
        type="button"
        className="add-friend-btn"
        aria-label={rowFriendActionName(action, name)}
        disabled={pending}
        onClick={send}
      >
        {ROW_FRIEND_LABEL[action]}
      </button>
      {error !== null && (
        <span className="add-friend-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
