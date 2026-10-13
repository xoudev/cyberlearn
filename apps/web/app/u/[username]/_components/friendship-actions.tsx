"use client";

// "use client" justification: the buttons follow the friendship as it changes
// on the page, and the menu behind "Ami ✓" opens and closes in place.

import React, { useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  canChallenge,
  FRIENDS_LABEL,
  FRIENDSHIP_ACTION_LABEL,
  friendshipActionAsksFirst,
  friendshipActions,
  friendshipAfter,
  friendshipMove,
  UNFRIEND_DETAIL,
  unfriendQuestion,
  type FriendshipAction,
  type FriendshipView,
} from "@cyberlearn/lib";
import { removeFriendAction, sendFriendRequestAction } from "@/app/(app)/_actions/friend-actions";
import { ConfirmButton } from "@/components/confirm-button";
import { useClickOutside } from "@/components/panel-trigger";

/**
 * What a visitor can do about a friendship, on somebody's profile.
 *
 * It is where a friendship starts: the panel in the navbar answers requests
 * and shows who you know, but adding somebody means having found them, and
 * where you find somebody is their profile.
 *
 * The buttons are the state's (@cyberlearn/lib/social/friendship): add,
 * cancel your request, or accept or refuse theirs. Between friends the card
 * says so, "Ami ✓", and ending it sits in a menu behind that, where it still
 * asks first: nobody is told, and undoing it takes a new request the other
 * person has to accept. A duel is offered from the same state, so it appears
 * the moment a request is accepted here and goes the moment the friendship
 * ends, without a reload.
 *
 * It knows only what the server told it when the page rendered, then what each
 * call answered: pressing "Accepter" on a request withdrawn in the meantime
 * sends one instead, and the buttons say that. A refusal is said under them
 * rather than leaving them as they were.
 */
export function FriendshipActions({
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const chipRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // The first button of whatever state the friendship is in. The one that was
  // pressed is usually gone once the call has answered (its state's buttons
  // are not the next one's), and the keyboard must not fall back to the top
  // of the page with it.
  const leadRef = useRef<HTMLButtonElement>(null);
  const moved = useRef(false);

  useClickOutside(menuOpen, menuRef, chipRef, setMenuOpen);

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    leadRef.current?.focus();
  }, [state]);

  const run = (action: FriendshipAction): void => {
    const move = friendshipMove(action);
    setError(null);
    start(async () => {
      try {
        const result =
          move === "request"
            ? await sendFriendRequestAction(targetId)
            : await removeFriendAction(targetId);
        if (result.ok) {
          moved.current = true;
          setMenuOpen(false);
          setState(friendshipAfter(move, result.becameFriends === true));
        } else {
          setError(result.error ?? "Impossible pour l'instant.");
        }
      } catch {
        setError("Impossible pour l'instant. Réessaie dans un moment.");
      }
    });
  };

  const actions = friendshipActions(state);

  return (
    <>
      {state === "friends" ? (
        <span className="pp-friend">
          <button
            ref={(node) => {
              chipRef.current = node;
              leadRef.current = node;
            }}
            type="button"
            className="btn btn--accent btn--ghost btn--sm"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? menuId : undefined}
            onClick={() => {
              setMenuOpen((open) => !open);
            }}
          >
            {FRIENDS_LABEL}
          </button>
          {menuOpen && (
            <div
              ref={menuRef}
              id={menuId}
              className="pp-friend__menu card"
              onKeyDown={(event) => {
                // The question, when it is asked, answers Escape itself.
                if (event.key !== "Escape") return;
                setMenuOpen(false);
                chipRef.current?.focus();
              }}
            >
              <ConfirmButton
                className="btn btn--danger btn--ghost btn--sm"
                ask={friendshipActionAsksFirst("unfriend")}
                pending={pending}
                question={unfriendQuestion(name)}
                detail={UNFRIEND_DETAIL}
                confirmLabel="Retirer"
                onConfirm={() => {
                  run("unfriend");
                }}
              >
                {FRIENDSHIP_ACTION_LABEL.unfriend}
              </ConfirmButton>
            </div>
          )}
        </span>
      ) : (
        actions.map((action, index) => (
          <button
            key={action}
            ref={index === 0 ? leadRef : undefined}
            type="button"
            className={
              action === "request" || action === "accept"
                ? "btn btn--accent btn--sm"
                : "btn btn--ghost btn--sm"
            }
            // aria-disabled rather than disabled: the focus is on this button
            // while the call runs, and a disabled button drops it on the page.
            aria-disabled={pending || undefined}
            onClick={() => {
              if (!pending) run(action);
            }}
          >
            {FRIENDSHIP_ACTION_LABEL[action]}
          </button>
        ))
      )}
      {canChallenge(state) && (
        <Link href={`/duels?ami=${targetId}`} className="btn btn--ghost btn--sm">
          Défier en duel
        </Link>
      )}
      {error !== null && (
        <span className="fp-error" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
