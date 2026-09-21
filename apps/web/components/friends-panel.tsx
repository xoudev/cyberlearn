"use client";

import React, { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  acceptFriendRequestAction,
  getFriendsAction,
  removeFriendAction,
  type FriendEntry,
  type FriendLists,
} from "@/app/(app)/_actions/friend-actions";
import { AvatarView } from "@/components/avatar-view";

/**
 * Friends, in the navbar rather than on a page of their own.
 *
 * A page was the wrong shape for this. Seeing who your friends are, answering a
 * request and dropping somebody are all glances - none of them is worth
 * leaving what you were doing for, and a menu entry that leads to three short
 * lists is a menu entry people stop clicking. So it sits next to the bell, as
 * the same kind of thing: a small mark that carries a number when somebody is
 * waiting on you, and a panel that opens where you already are.
 *
 * The lists are read when the panel opens, not on every page load. The only
 * thing every page pays for is the count.
 */

const EMPTY: FriendLists = { incoming: [], friends: [], outgoing: [] };

function FriendsGlyph(): React.JSX.Element {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="7.5" cy="6.5" r="3" />
      <path d="M2 16.5c0-3 2.5-4.6 5.5-4.6s5.5 1.6 5.5 4.6" />
      <circle cx="14.5" cy="7.5" r="2.4" />
      <path d="M13 12.2c3 0 5 1.5 5 4.3" />
    </svg>
  );
}

type RowKind = "incoming" | "friends" | "outgoing";

/** What the row did, which is not the same as which list it was in. */
type RowOutcome = "accepted" | "removed";

function Row({
  edge,
  kind,
  onDone,
  onClose,
}: {
  edge: FriendEntry;
  kind: RowKind;
  onDone: (personId: string, outcome: RowOutcome) => void;
  onClose: () => void;
}): React.JSX.Element {
  const [pending, start] = useTransition();
  const person = edge.person;
  const name = person.displayName || (person.username ?? "?");

  const act = (run: () => Promise<{ ok: boolean }>, outcome: RowOutcome): void => {
    start(async () => {
      const result = await run();
      if (result.ok) onDone(person.id, outcome);
    });
  };

  return (
    <li className="fp-row">
      {/* The panel used to draw initials and nothing else, so somebody who had
          set a picture had one everywhere but in their own friends list. */}
      <AvatarView src={edge.avatarSrc} name={name} className="fp-avatar" glyphSize={16} />

      <span className="fp-identity">
        {person.username !== null ? (
          <Link href={`/u/${person.username}`} className="fp-name" onClick={onClose}>
            {name}
          </Link>
        ) : (
          <span className="fp-name">{name}</span>
        )}
        <span className="fp-meta">NIV·{person.level}</span>
      </span>

      <span className="fp-actions">
        {kind === "incoming" && (
          <button
            type="button"
            className="fp-btn fp-btn--primary"
            disabled={pending}
            onClick={() => {
              act(() => acceptFriendRequestAction(person.id), "accepted");
            }}
          >
            Accepter
          </button>
        )}
        <button
          type="button"
          className="fp-btn"
          disabled={pending}
          onClick={() => {
            // Refusing and unfriending are the same call and the opposite
            // outcome from accepting - which is why the row says which it was
            // rather than the panel guessing from the list it sat in.
            act(() => removeFriendAction(person.id), "removed");
          }}
        >
          {kind === "friends" ? "Retirer" : kind === "incoming" ? "Refuser" : "Annuler"}
        </button>
      </span>
    </li>
  );
}

export function FriendsPanel({
  initialRequestCount,
}: {
  initialRequestCount: number;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<FriendLists>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [waiting, setWaiting] = useState(initialRequestCount);
  const [isPending, startTransition] = useTransition();

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  useEffect(() => {
    if (!open || loaded) return;
    startTransition(async () => {
      const next = await getFriendsAction();
      setLists(next);
      setWaiting(next.incoming.length);
      setLoaded(true);
    });
  }, [open, loaded]);

  /**
   * Drops somebody from every list at once.
   *
   * The row that was acted on is gone whichever list it was in - accepting
   * moves it, refusing and cancelling remove it - and the panel is closed to
   * the server until it reopens, so the lists are corrected here rather than
   * re-fetched behind a spinner.
   */
  const settle = useCallback((personId: string, outcome: RowOutcome, wasWaiting: boolean) => {
    setLists((prev) => {
      const moved = prev.incoming.find((edge) => edge.person.id === personId);
      return {
        incoming: prev.incoming.filter((edge) => edge.person.id !== personId),
        outgoing: prev.outgoing.filter((edge) => edge.person.id !== personId),
        friends:
          outcome === "accepted" && moved
            ? [moved, ...prev.friends]
            : prev.friends.filter((edge) => edge.person.id !== personId),
      };
    });
    // Outside the updater on purpose: React may run an updater twice, and a
    // counter decremented from inside one would go down twice.
    //
    // Both answers clear a waiting request - accepting and refusing alike -
    // which is why this follows the list the row was in rather than what was
    // done to it. Unfriending somebody is not one fewer person waiting.
    if (wasWaiting) setWaiting((count) => Math.max(0, count - 1));
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const hasWaiting = waiting > 0;
  const sections: { kind: RowKind; label: string; edges: FriendEntry[] }[] = [
    { kind: "incoming", label: "Demandes reçues", edges: lists.incoming },
    { kind: "friends", label: "Amis", edges: lists.friends },
    { kind: "outgoing", label: "Demandes envoyées", edges: lists.outgoing },
  ];
  const empty = loaded && sections.every((section) => section.edges.length === 0);

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((o) => !o);
        }}
        aria-label={hasWaiting ? `${String(waiting)} demandes d'ami en attente` : "Amis"}
        className="notif-bell"
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          background: open
            ? "color-mix(in srgb, var(--cosmetic-accent) 6%, transparent)"
            : "transparent",
          border: `1px solid ${open ? "color-mix(in srgb, var(--cosmetic-accent) 20%, transparent)" : "transparent"}`,
          cursor: "pointer",
          color: open ? "var(--cosmetic-accent)" : "#6B6890",
          transition: "all 150ms ease",
        }}
      >
        <FriendsGlyph />

        {hasWaiting && (
          <span aria-hidden="true" className="fp-badge">
            {waiting > 99 ? "99+" : String(waiting)}
          </span>
        )}
      </button>

      {open && (
        <div ref={panelRef} className="fp-panel">
          <div className="fp-head">
            <span className="fp-head-label">
              <span aria-hidden="true" className="fp-head-rule" />
              Amis
            </span>
            {hasWaiting && <span className="fp-head-count">{waiting} en attente</span>}
          </div>

          {!loaded && isPending && <p className="fp-note">Chargement…</p>}

          {empty && (
            <p className="fp-note">
              {"// personne pour l'instant : ouvre le profil de quelqu'un pour l'ajouter"}
            </p>
          )}

          {sections.map((section) =>
            section.edges.length === 0 ? null : (
              <section key={section.kind}>
                <h3 className="fp-section">
                  {section.label} · {section.edges.length}
                </h3>
                <ul className="fp-list">
                  {section.edges.map((edge) => (
                    <Row
                      key={edge.id}
                      edge={edge}
                      kind={section.kind}
                      onClose={close}
                      onDone={(personId, outcome) => {
                        settle(personId, outcome, section.kind === "incoming");
                      }}
                    />
                  ))}
                </ul>
              </section>
            ),
          )}
        </div>
      )}
    </div>
  );
}
