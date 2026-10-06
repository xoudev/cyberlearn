"use client";

import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";
import { createDuelAction } from "../_actions/duel-actions";

/** Challenge a friend on a path; the duel opens on its own page. */
export function NewDuelForm({
  friends,
  paths,
  initialFriend,
}: {
  friends: { id: string; name: string }[];
  paths: { id: string; title: string }[];
  initialFriend: string | null;
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

  const field: React.CSSProperties = {
    padding: "8px 10px",
    background: "var(--color-bg-sunken, #05041A)",
    color: "var(--color-text-primary)",
    border: "1px solid var(--color-border-default)",
  };

  return (
    <div className="card" style={{ padding: "14px 18px", display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
          Ami
          <select
            value={friend}
            onChange={(event) => {
              setFriend(event.target.value);
            }}
            style={field}
          >
            {friends.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 13, flex: 1, minWidth: 220 }}>
          Parcours
          <select
            value={path}
            onChange={(event) => {
              setPath(event.target.value);
            }}
            style={field}
          >
            {paths.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn--accent btn--sm"
          onClick={send}
          disabled={pending || friend === "" || path === ""}
        >
          Lancer le défi
        </button>
        {error !== null ? (
          <span role="alert" style={{ color: "var(--color-danger)", fontSize: 13 }}>
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}
