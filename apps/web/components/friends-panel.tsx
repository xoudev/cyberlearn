"use client";

import React, { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  acceptFriendRequestAction,
  getFriendsAction,
  removeFriendAction,
  type FriendActionResult,
  type FriendEntry,
  type FriendLists,
} from "@/app/(app)/_actions/friend-actions";
import { AvatarView } from "@/components/avatar-view";
import { ConfirmButton } from "@/components/confirm-button";
import { FriendsGlyph } from "@/components/friend-mark";
import { PanelButton, useClickOutside } from "@/components/panel-trigger";
import { DUEL_QUERY } from "@/app/(app)/duels/_components/duel-query";
import { useQueryDialog } from "@/hooks/use-query-dialog";
import { levelLabel } from "@cyberlearn/lib/gamification/level-label";
import {
  CHALLENGE_LABEL,
  challengeFriendName,
  DUEL_OPEN_LABEL,
  HANDLE_FORMAT_ERROR,
  handleFrom,
  UNFRIEND_DETAIL,
  UNFRIEND_PROMPT,
  unfriendQuestion,
} from "@cyberlearn/lib/social/friendship";

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
 * thing every page pays for is the count. They come whole, however long: the
 * panel scrolls under its sticky head.
 *
 * It is also where somebody is found (a handle typed, their profile opened)
 * and where a friend is challenged: "Défier" opens the "Défier" window over
 * the page, that friend already picked, and waits, greyed, while a duel
 * between the two is still open.
 */

const EMPTY: FriendLists = { incoming: [], friends: [], outgoing: [] };

type RowKind = "incoming" | "friends" | "outgoing";

/** What the row did, which is not the same as which list it was in. */
type RowOutcome = "accepted" | "removed";

function Row({
  edge,
  kind,
  onDone,
  onClose,
  onChallenge,
}: {
  edge: FriendEntry;
  kind: RowKind;
  onDone: (personId: string, outcome: RowOutcome) => void;
  onClose: () => void;
  /** Opens the "Défier" window with this friend picked. */
  onChallenge: (personId: string) => void;
}): React.JSX.Element {
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const person = edge.person;
  const name = person.displayName || (person.username ?? "?");

  // A refusal used to leave the row as it was, with nothing said: the button
  // looked broken. The server's reason, or a plain one when the call itself
  // failed, now takes the line under the name.
  const act = (run: () => Promise<FriendActionResult>, outcome: RowOutcome): void => {
    setError(null);
    start(async () => {
      try {
        const result = await run();
        if (result.ok) onDone(person.id, outcome);
        else setError(result.error ?? "Impossible pour l'instant.");
      } catch {
        setError("Impossible pour l'instant. Réessaie dans un moment.");
      }
    });
  };

  return (
    <li className="fp-row">
      {/* The panel used to draw initials and nothing else, so somebody who had
          set a picture had one everywhere but in their own friends list. */}
      <AvatarView src={edge.avatarSrc} name={name} className="fp-avatar" glyphSize={16} />

      <span className="fp-identity">
        {/* A pending request opens nothing: a private profile on the other side
            of one is a name, not a link to a 404. */}
        {person.username !== null && edge.profileOpen ? (
          <Link href={`/u/${person.username}`} className="fp-name" onClick={onClose}>
            {name}
          </Link>
        ) : (
          <span className="fp-name">{name}</span>
        )}
        {error !== null ? (
          <span className="fp-error" role="alert">
            {error}
          </span>
        ) : asking ? (
          // The row is too narrow for the question beside its answers, so it
          // takes the line under the name, where the level was.
          <span className="fp-error" aria-hidden="true">
            {UNFRIEND_PROMPT}
          </span>
        ) : (
          <span className="fp-meta">{levelLabel(person.level)}</span>
        )}
      </span>

      <span className="fp-actions">
        {/* Hidden while the row asks whether to unfriend: the answers need
            the room, and challenging somebody one is about to drop is not
            the question. A duel already open greys it rather than hiding
            it, so the row still says why there is nothing to do. */}
        {kind === "friends" && !asking && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            aria-label={challengeFriendName(name, edge.duelOpen)}
            {...(edge.duelOpen
              ? { "aria-disabled": true, title: DUEL_OPEN_LABEL }
              : { "aria-haspopup": "dialog" as const })}
            disabled={pending}
            onClick={() => {
              if (!edge.duelOpen) onChallenge(person.id);
            }}
          >
            {edge.duelOpen ? DUEL_OPEN_LABEL : CHALLENGE_LABEL}
          </button>
        )}
        {kind === "incoming" && (
          <button
            type="button"
            className="btn btn--accent btn--sm"
            disabled={pending}
            onClick={() => {
              act(() => acceptFriendRequestAction(person.id), "accepted");
            }}
          >
            Accepter
          </button>
        )}
        {/* Refusing and unfriending are the same call and the opposite
            outcome from accepting - which is why the row says which it was
            rather than the panel guessing from the list it sat in. Only
            unfriending asks first: nobody is told, and only the other person
            can undo it. A request costs one tap to send again. The row has
            no room for the detail the profile shows under the question, so
            it is the group's description only, read out but not drawn. */}
        <ConfirmButton
          className="btn btn--ghost btn--sm"
          ask={kind === "friends"}
          pending={pending}
          question={unfriendQuestion(name)}
          detail={UNFRIEND_DETAIL}
          confirmLabel="Retirer"
          showQuestion={false}
          onAskingChange={(next) => {
            setAsking(next);
            // A failure from the last try would hold the line the question
            // takes, and the answers would sit under an unrelated message.
            if (next) setError(null);
          }}
          onConfirm={() => {
            act(() => removeFriendAction(person.id), "removed");
          }}
        >
          {kind === "friends" ? "Retirer" : kind === "incoming" ? "Refuser" : "Annuler"}
        </ConfirmButton>
      </span>
    </li>
  );
}

/**
 * Opens somebody's profile by their handle: the panel's way to find a person,
 * the app's friends screen's too (same reading, `handleFrom`, same words).
 * A handle that cannot be one is said under the field rather than sent off to
 * a 404.
 */
function FindSomebody({ onOpen }: { onOpen: () => void }): React.JSX.Element {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();
  const errorId = useId();

  return (
    <form
      className="fp-find"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const handle = handleFrom(value);
        if (handle === null) {
          setError(HANDLE_FORMAT_ERROR);
          return;
        }
        setError(null);
        setValue("");
        onOpen();
        router.push(`/u/${handle}`);
      }}
    >
      <label htmlFor={fieldId} className="fp-section fp-find-label">
        Ouvrir un profil
      </label>
      <div className="fp-find-row">
        <input
          id={fieldId}
          className="fp-find-input"
          type="text"
          value={value}
          placeholder="@pseudo"
          maxLength={40}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={error !== null}
          {...(error !== null ? { "aria-describedby": errorId } : {})}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
        />
        <button type="submit" className="btn btn--ghost btn--sm">
          Ouvrir
        </button>
      </div>
      {error !== null && (
        <span id={errorId} className="fp-error" role="alert">
          {error}
        </span>
      )}
    </form>
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
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  // The count comes from the server, which re-reads it on every refresh of the
  // layout; the state above is only its first value. Answering a request from
  // a notification refreshed the layout without this panel hearing of it: the
  // badge stayed up for the whole visit, and a list already loaded still held
  // the request, whose "Accepter" then answered "déjà traitée".
  //
  // A new count the panel did not cause itself - its own answers have already
  // lowered `waiting` by the time the refresh arrives - means the lists it
  // holds are out of date: they are read again, at once if it is open.
  const [seenCount, setSeenCount] = useState(initialRequestCount);
  if (initialRequestCount !== seenCount) {
    setSeenCount(initialRequestCount);
    if (initialRequestCount !== waiting) {
      setWaiting(initialRequestCount);
      setLoaded(false);
    }
  }

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useClickOutside(open, panelRef, buttonRef, setOpen);

  // An error thrown inside a transition goes to the nearest error boundary,
  // which for the navbar is the site's own: a database hiccup on opening the
  // panel used to replace the whole page, and whatever was typed on it. It
  // is said in the panel instead, and closing and reopening it tries again.
  const load = useCallback(() => {
    startTransition(async () => {
      setFailed(false);
      try {
        const next = await getFriendsAction();
        setLists(next);
        setWaiting(next.incoming.length);
        setLoaded(true);
      } catch {
        setFailed(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!open || loaded) return;
    load();
  }, [open, loaded, load]);

  /**
   * Drops somebody from every list at once.
   *
   * The row that was acted on is gone whichever list it was in - accepting
   * moves it, refusing and cancelling remove it - and the panel is closed to
   * the server until it reopens, so the lists are corrected here rather than
   * re-fetched behind a spinner.
   */
  const incoming = lists.incoming;
  const settle = useCallback(
    (personId: string, outcome: RowOutcome, wasWaiting: boolean) => {
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
      // Outside the updater on purpose: React may run an updater twice.
      //
      // Both answers clear a waiting request - accepting and refusing alike -
      // which is why this follows the list the row was in rather than what was
      // done to it. Unfriending somebody is not one fewer person waiting.
      //
      // The count is what is left in the list, not the last count minus one:
      // the layout's refresh, which carries the new count down from the
      // server, can reach this panel before or after this call, and each of
      // them lowering a number would take it down twice.
      if (wasWaiting) {
        setWaiting(incoming.filter((edge) => edge.person.id !== personId).length);
      }
    },
    [incoming],
  );

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  // The window draws over the page, so the panel gets out of its way. A duel
  // made there greys that friend's "Défier", which only the server knows of:
  // the next opening reads the lists again instead of the ones held here.
  const duelWindow = useQueryDialog(DUEL_QUERY);
  const challenge = useCallback(
    (personId: string) => {
      setOpen(false);
      setLoaded(false);
      duelWindow.open(personId);
    },
    [duelWindow],
  );

  const hasWaiting = waiting > 0;
  const sections: { kind: RowKind; label: string; edges: FriendEntry[] }[] = [
    { kind: "incoming", label: "Demandes reçues", edges: lists.incoming },
    { kind: "friends", label: "Amis", edges: lists.friends },
    { kind: "outgoing", label: "Demandes envoyées", edges: lists.outgoing },
  ];
  const empty = loaded && sections.every((section) => section.edges.length === 0);

  return (
    <div style={{ position: "relative" }}>
      <PanelButton
        buttonRef={buttonRef}
        open={open}
        count={waiting}
        label={hasWaiting ? `${String(waiting)} demandes d'ami en attente` : "Amis"}
        onClick={() => {
          setOpen((o) => !o);
        }}
      >
        <FriendsGlyph />
      </PanelButton>

      {open && (
        <div ref={panelRef} className="fp-panel">
          <div className="fp-head">
            <span className="fp-head-label">
              <span aria-hidden="true" className="fp-head-rule" />
              Amis
            </span>
            {hasWaiting && <span className="fp-head-count">{waiting} en attente</span>}
          </div>

          <FindSomebody onOpen={close} />

          {!loaded && isPending && <p className="fp-note">Chargement…</p>}

          {!loaded && !isPending && failed && (
            <p className="fp-note" role="alert">
              Chargement impossible pour l&apos;instant.{" "}
              <button type="button" className="btn btn--ghost btn--sm" onClick={load}>
                Réessayer
              </button>
            </p>
          )}

          {empty && (
            <p className="fp-note">
              Personne pour l&apos;instant. Tape le @pseudo de quelqu&apos;un ci-dessus, ou ajoute
              un camarade depuis ta classe ou le classement.
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
                      onChallenge={challenge}
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
