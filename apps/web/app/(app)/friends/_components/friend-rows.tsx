"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import type { FriendEdge } from "@cyberlearn/db";
import {
  acceptFriendRequestAction,
  removeFriendAction,
  sendFriendRequestAction,
} from "../_actions/friend-actions";

/**
 * One person in a list, and the buttons that belong to that list.
 *
 * Three lists, three sets of buttons: a friend can be removed, a request can be
 * accepted or declined, and one you sent can only be cancelled. They share a
 * row rather than three near-identical components, because the row is the part
 * that has to look the same everywhere.
 */

export type FriendListKind = "friends" | "incoming" | "outgoing";

/** Initials, the same way the navbar builds them. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/u).filter(Boolean);
  const [first, second] = parts;
  if (first && second) return (first.charAt(0) + second.charAt(0)).toUpperCase();
  return (first ?? "?").slice(0, 2).toUpperCase();
}

export function FriendRow({
  edge,
  kind,
}: {
  edge: FriendEdge;
  kind: FriendListKind;
}): React.JSX.Element {
  const [pending, start] = useTransition();
  const [gone, setGone] = useState(false);
  const person = edge.person;

  if (gone) return <></>;

  const act = (run: () => Promise<{ ok: boolean }>): void => {
    start(async () => {
      const result = await run();
      // The row is about to be replaced by the server's version anyway; hiding
      // it now is what stops the list feeling a beat behind the click.
      if (result.ok) setGone(true);
    });
  };

  return (
    <li className="fr-row">
      <span className="fr-avatar" aria-hidden="true">
        {initials(person.displayName || (person.username ?? "?"))}
      </span>

      <span className="fr-identity">
        {person.username !== null ? (
          <Link href={`/u/${person.username}`} className="fr-name">
            {person.displayName || person.username}
          </Link>
        ) : (
          <span className="fr-name">{person.displayName}</span>
        )}
        <span className="fr-meta">
          NIV·{person.level} · {person.xpTotal.toLocaleString("fr-FR")} XP
        </span>
      </span>

      <span className="fr-actions">
        {kind === "incoming" && (
          <button
            type="button"
            className="fr-btn fr-btn--primary"
            disabled={pending}
            onClick={() => {
              act(() => acceptFriendRequestAction(person.id));
            }}
          >
            Accepter
          </button>
        )}
        <button
          type="button"
          className="fr-btn"
          disabled={pending}
          onClick={() => {
            act(() => removeFriendAction(person.id));
          }}
        >
          {kind === "friends" ? "Retirer" : kind === "incoming" ? "Refuser" : "Annuler"}
        </button>
      </span>
    </li>
  );
}

/**
 * The button on somebody else's profile.
 *
 * It knows only what the server told it when the page rendered, and says so
 * afterwards rather than guessing: pressing it on somebody who has already
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

  if (state === "friends") {
    return (
      <button
        type="button"
        className="fr-btn"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const result = await removeFriendAction(targetId);
            if (result.ok) setState("none");
          });
        }}
      >
        Retirer des amis
      </button>
    );
  }

  if (state === "outgoing") {
    return (
      <button
        type="button"
        className="fr-btn"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const result = await removeFriendAction(targetId);
            if (result.ok) setState("none");
          });
        }}
      >
        Annuler la demande
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className="fr-btn fr-btn--primary"
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
        <span className="fr-error" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
