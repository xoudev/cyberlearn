"use client";

// "use client" justification: the two selects are controlled (the friend's
// monogram follows the choice), and the challenge, once sent, opens the new
// duel's page (router).

import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";
import { initialsOf } from "@/lib/avatar/glyphs";
import { createDuelAction } from "../_actions/duel-actions";

/**
 * Challenge a friend on a path, set out as the duel it starts: the reader's
 * tile, "contre", the friend's tile beside the friend picked, then the path
 * and the button. The duel opens on its own page.
 */
export function NewDuelForm({
  friends,
  paths,
  initialFriend,
  readerInitials,
}: {
  friends: { id: string; name: string }[];
  paths: { id: string; title: string }[];
  initialFriend: string | null;
  /** The reader's monogram, for their side of the panel. */
  readerInitials: string;
}): React.ReactElement {
  const router = useRouter();
  const [friend, setFriend] = useState(
    friends.some((f) => f.id === initialFriend) ? (initialFriend ?? "") : (friends[0]?.id ?? ""),
  );
  const [path, setPath] = useState(paths[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const send = (): void => {
    startTransition(async () => {
      const result = await createDuelAction({ opponentId: friend, pathId: path });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/duels/${result.id}`);
    });
  };

  const chosen = friends.find((f) => f.id === friend);

  return (
    <div className="dl-new">
      <div className="dl-new__versus">
        <div className="dl-new__me">
          <span className="dl-mono" data-me="true" aria-hidden="true">
            {readerInitials}
          </span>
          <span className="dl-new__who">Toi</span>
        </div>
        <span className="dl-vs" aria-hidden="true">
          contre
        </span>
        <div className="dl-new__them">
          <span className="dl-mono" aria-hidden="true">
            {chosen === undefined ? "?" : initialsOf(chosen.name)}
          </span>
          <label className="dl-field">
            <span className="dl-field__label">Ami</span>
            <span className="dl-field__control">
              <select
                value={friend}
                onChange={(event) => {
                  setFriend(event.target.value);
                }}
              >
                {friends.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </span>
          </label>
        </div>
      </div>

      <label className="dl-field">
        <span className="dl-field__label">Parcours</span>
        <span className="dl-field__control">
          <select
            value={path}
            onChange={(event) => {
              setPath(event.target.value);
            }}
          >
            {paths.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </span>
      </label>

      <div className="dl-new__go">
        <button
          type="button"
          className="btn btn--accent"
          onClick={send}
          disabled={pending || friend === "" || path === ""}
        >
          Lancer le défi <span aria-hidden="true">→</span>
        </button>
      </div>

      {error !== null ? (
        <p role="alert" className="dl-error dl-new__error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
