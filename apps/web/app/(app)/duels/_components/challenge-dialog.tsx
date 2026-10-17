"use client";

// "use client" justification: a window over the page, opened and closed by
// the address in the browser; it reads the reader's friends when it opens and
// sends the challenge in place.

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useId, useState, useTransition } from "react";
import { ModalShell, Select } from "@cyberlearn/ui";
import { levelLabel } from "@cyberlearn/lib/gamification/level-label";
import {
  canChallengeFriend,
  challengeTarget,
  FRIEND_IN_DUEL_LABEL,
} from "@cyberlearn/lib/social/duel";
import { AvatarView } from "@/components/avatar-view";
import { EmptyState } from "@/components/empty-state";
import type { QueryDialogProps } from "@/hooks/use-query-dialog";
import type { DuelFriend, DuelSetup } from "@/lib/social/duels";
import { createDuelAction, duelSetupAction } from "../_actions/duel-actions";
import { wantedFriend } from "./duel-query";

type Load = { kind: "loading" } | { kind: "failed" } | { kind: "ready"; setup: DuelSetup };

/** "@alex · Niv. 4": who a friend is beside their name. */
function friendMeta(friend: DuelFriend): string {
  const level = levelLabel(friend.level);
  return friend.username === null ? level : `@${friend.username} · ${level}`;
}

/** The avatar, the name and the line under it, as every card of the grid draws them. */
function Identity({ friend }: { friend: DuelFriend }): React.JSX.Element {
  return (
    <>
      <AvatarView
        src={friend.avatarSrc}
        name={friend.name}
        className="dlc-card__avatar"
        glyphSize={20}
      />
      <span className="dlc-card__who">
        <span className="dlc-card__name">{friend.name}</span>
        <span className="dlc-card__meta">{friendMeta(friend)}</span>
      </span>
    </>
  );
}

/**
 * "Défier un ami", in a window over the page (?duel=1, or ?duel=<friend id>
 * with that friend picked; registered in components/query-dialogs.ts).
 *
 * It used to be a form in the middle of /duels, the friends in a bare select.
 * The window opens from /duels, from a finished duel's "Rejouer", and from a
 * friend's profile (the old /duels?ami=<id> lands on it): each friend is a
 * card with their avatar, their @handle and their level, picked like a radio
 * button. A friend already in a duel with the reader cannot be picked: the
 * card says so and leads to that duel. Then the path, and the challenge: the
 * new duel's page takes the window's place in the history (router.replace),
 * so Back returns to the page the window was opened over.
 *
 * The friends are read when the window opens (duelSetupAction), not with the
 * page under it: the window opens over any page of the site.
 */
export default function ChallengeDialog({ value, onClose }: QueryDialogProps): React.JSX.Element {
  const formId = useId();
  const router = useRouter();
  const wanted = wantedFriend(value);
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  // The reader's own pick, for the address it was made under: a window opened
  // again for another friend starts on that friend.
  const [choice, setChoice] = useState<{ value: string; friend: string } | null>(null);
  const [pathChoice, setPathChoice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let live = true;
    duelSetupAction().then(
      (setup) => {
        if (live) setLoad({ kind: "ready", setup });
      },
      () => {
        if (live) setLoad({ kind: "failed" });
      },
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  const setup = load.kind === "ready" ? load.setup : null;
  const friends = setup?.friends ?? [];
  const paths = setup?.paths ?? [];
  const friend =
    choice !== null && choice.value === value ? choice.friend : challengeTarget(friends, wanted);
  const path = pathChoice ?? paths[0]?.id ?? "";
  const anyFree = friends.some(canChallengeFriend);
  const canSend = friend !== null && path !== "" && !pending;

  const send = (e: React.SyntheticEvent): void => {
    e.preventDefault();
    if (friend === null || path === "") {
      setError("Choisis un ami et un parcours.");
      return;
    }
    setError(null);
    start(async () => {
      try {
        const result = await createDuelAction({ opponentId: friend, pathId: path });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        // In place of the window's step of the history (docs/dev/dialogs.md).
        router.replace(`/duels/${result.id}`);
      } catch {
        // The call itself failed (the network, a deploy): nothing was sent.
        setError("Envoi impossible. Réessaie dans un moment.");
      }
    });
  };

  const closeOnly = (
    <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
      Fermer
    </button>
  );

  let body: React.ReactNode;
  let actions: React.ReactNode = closeOnly;
  if (load.kind === "loading") {
    body = (
      <div className="dlc" aria-busy="true">
        <p className="sr-only" role="status">
          Chargement de tes amis…
        </p>
        <ul className="dlc-grid" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="dlc-card dlc-card--loading" />
          ))}
        </ul>
      </div>
    );
  } else if (load.kind === "failed") {
    body = (
      <div className="dlc">
        <p className="cls-alert" data-tone="bad" role="alert">
          Impossible de charger tes amis pour l&apos;instant.
        </p>
      </div>
    );
    actions = (
      <>
        {closeOnly}
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => {
            setLoad({ kind: "loading" });
            setAttempt((n) => n + 1);
          }}
        >
          Réessayer
        </button>
      </>
    );
  } else if (friends.length === 0) {
    body = (
      <div className="dlc">
        <EmptyState
          title="Pas encore d'ami à défier"
          message="Un duel se joue entre amis : ajoute quelqu'un depuis son profil, ou accepte une demande dans le panneau Amis en haut de page, puis reviens ici."
        />
      </div>
    );
  } else {
    body = (
      <form id={formId} className="dlc" onSubmit={send} noValidate>
        <fieldset className="dlc-friends">
          <legend className="cls-field__label">Ami</legend>
          <ul className="dlc-grid">
            {friends.map((f) => {
              const id = `${formId}-friend-${f.id}`;
              if (f.openDuelId !== null) {
                return (
                  <li key={f.id} className="dlc-card" data-busy="true">
                    <div className="dlc-card__box">
                      <Identity friend={f} />
                      <span className="dlc-card__busy">
                        {FRIEND_IN_DUEL_LABEL}
                        {" · "}
                        <Link href={`/duels/${f.openDuelId}`} replace className="dlc-card__link">
                          Voir le duel<span className="sr-only"> contre {f.name}</span>
                        </Link>
                      </span>
                    </div>
                  </li>
                );
              }
              return (
                <li key={f.id} className="dlc-card">
                  <input
                    id={id}
                    className="dlc-card__input"
                    type="radio"
                    name={`${formId}-friend`}
                    value={f.id}
                    checked={friend === f.id}
                    onChange={() => {
                      setChoice({ value, friend: f.id });
                      setError(null);
                    }}
                  />
                  <label htmlFor={id} className="dlc-card__box">
                    <Identity friend={f} />
                    <span className="dlc-card__tick" aria-hidden="true" />
                  </label>
                </li>
              );
            })}
          </ul>
          {anyFree ? null : (
            <p className="dlc-note">
              Tu as déjà un duel en cours avec chacun de tes amis : il se règle en un jour au plus.
            </p>
          )}
        </fieldset>

        <div className="cls-field">
          <label className="cls-field__label" htmlFor={`${formId}-path`}>
            Parcours
          </label>
          {paths.length > 0 ? (
            <Select
              id={`${formId}-path`}
              name="path"
              value={path}
              onChange={(next) => {
                setPathChoice(next);
                setError(null);
              }}
              options={paths.map((p) => ({ value: p.id, label: p.title }))}
            />
          ) : (
            <p className="dlc-note">
              Aucun parcours n&apos;est ouvert pour un duel pour l&apos;instant.
            </p>
          )}
        </div>

        {error !== null ? (
          <p className="cls-alert" data-tone="bad" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    );
    actions = (
      <>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onClose}
          disabled={pending}
        >
          Annuler
        </button>
        <button type="submit" form={formId} className="btn btn--accent btn--sm" disabled={!canSend}>
          {pending ? "Envoi…" : "Lancer le défi"} <span aria-hidden="true">→</span>
        </button>
      </>
    );
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      eyebrow="Duels"
      title="Défier un ami"
      meta="Cinq questions sur un parcours, les mêmes pour vous deux. Ton ami a un jour pour accepter."
      maxWidth={720}
      dismissable={!pending}
      actions={actions}
    >
      {body}
    </ModalShell>
  );
}
