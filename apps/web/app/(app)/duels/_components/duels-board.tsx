import Link from "next/link";
import React from "react";
import {
  duelActionLabel,
  duelRecord,
  duelSmallPrint,
  OUTCOME_LABEL,
  outcomeOf,
  wasPlayed,
} from "@cyberlearn/lib/social/duel";
import { Crumb } from "@/components/crumb";
import { EmptyState } from "@/components/empty-state";
import { initialsOf } from "@/lib/avatar/glyphs";
import type { DuelSummary } from "@/lib/social/duels";
import { dayOf, plural, whenOf } from "./duel-words";
import { NewDuelForm } from "./new-duel-form";
import { RespondButtons } from "./respond-buttons";
import "./duels.css";

/**
 * An invitation, as the duel it would start: the friend's monogram, who
 * challenges the reader on which path, when the offer lapses, and the answer.
 */
function InvitationCard({ duel }: { duel: DuelSummary }): React.ReactElement {
  return (
    <li className="dl-invites__item">
      <article className="dl-invite">
        <p className="dl-invite__eyebrow">Défi reçu</p>
        <span className="dl-mono dl-mono--lg" aria-hidden="true">
          {initialsOf(duel.other.name)}
        </span>
        <div>
          <p className="dl-invite__text">
            <strong>{duel.other.name}</strong> te défie sur «&nbsp;{duel.pathTitle}&nbsp;»
          </p>
          <p className="dl-invite__meta">
            {duel.questionCount} {plural(duel.questionCount, "question")} · expire{" "}
            <time dateTime={duel.expiresAt}>{whenOf(duel.expiresAt)}</time>
          </p>
        </div>
        <div className="dl-invite__actions">
          <RespondButtons duelId={duel.id} />
        </div>
      </article>
    </li>
  );
}

/**
 * One of the reader's duels: the path and its outcome in a word, both
 * players face to face with their scores, the small print, and the way in.
 */
function DuelCard({ duel }: { duel: DuelSummary }): React.ReactElement {
  const outcome = outcomeOf(duel);
  const reader = String(duel.readerScore.correct);
  const other = String(duel.otherScore.correct);
  return (
    <article className="dl-card" data-outcome={outcome}>
      <div className="dl-card__top">
        <span className="dl-card__path" title={duel.pathTitle}>
          {duel.pathTitle}
        </span>
        <span className="dl-badge" data-outcome={outcome}>
          {OUTCOME_LABEL[outcome]}
        </span>
      </div>
      <div className="dl-card__vs">
        <div className="dl-card__side">
          <span className="dl-mono dl-mono--sm" data-me="true" aria-hidden="true">
            {initialsOf(duel.reader.name)}
          </span>
          <span className="dl-card__name">Toi</span>
        </div>
        {wasPlayed(outcome) ? (
          <p className="dl-card__score">
            <span className="sr-only">{`${reader} à ${other}`}</span>
            <b aria-hidden="true">{reader}</b>
            <span className="dl-card__dash" aria-hidden="true">
              –
            </span>
            <b aria-hidden="true">{other}</b>
          </p>
        ) : (
          <p className="dl-card__score" aria-hidden="true">
            <span className="dl-card__dash">–</span>
          </p>
        )}
        <div className="dl-card__side dl-card__side--other">
          <span className="dl-mono dl-mono--sm" aria-hidden="true">
            {initialsOf(duel.other.name)}
          </span>
          <span className="dl-card__name" title={duel.other.name}>
            {duel.other.name}
          </span>
        </div>
      </div>
      <p className="dl-card__meta">{duelSmallPrint(duel, { when: whenOf, day: dayOf })}</p>
      <Link href={`/duels/${duel.id}`} className="dl-card__go">
        {duelActionLabel(duel)}
        <span className="sr-only"> contre {duel.other.name}</span>
        <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}

/**
 * Quiz duels between friends: the reader's record, the rules in three facts,
 * the invitations waiting for an answer, a panel to challenge a friend on a
 * path, and every duel going on or settled. A duel opens on its own page.
 * Drawn from what the page read (page.tsx), so it renders without a request.
 */
export function DuelsBoard({
  duels,
  friends,
  paths,
  initialFriend,
  readerName,
}: {
  duels: DuelSummary[];
  friends: { id: string; name: string }[];
  paths: { id: string; title: string }[];
  /** The friend named in ?ami=, preselected in the form. */
  initialFriend: string | null;
  readerName: string;
}): React.ReactElement {
  const invitations = duels.filter((d) => d.status === "PENDING" && !d.readerIsChallenger);
  const others = duels.filter((d) => !invitations.includes(d));
  const friendCount = friends.length;
  const record = duelRecord(duels);

  return (
    <div className="page-container dl">
      <header className="dl-head">
        <div>
          <Crumb segments={["duels"]} />
          <p className="pg-eyebrow">
            Communauté
            {friendCount > 0 ? (
              <>
                {" "}
                · <b>{friendCount}</b> {plural(friendCount, "ami")} à défier
              </>
            ) : null}
          </p>
          <h1 className="pg-title">Duels</h1>
          <p className="pg-lede">
            Défie un ami sur un parcours : chacun répond de son côté aux mêmes questions, et voit le
            score de l&apos;autre avancer en direct.
          </p>
        </div>
        {duels.length > 0 && (
          <ul className="dl-record" aria-label="Ton bilan">
            {record.map((line) => (
              <li key={line.outcome} data-outcome={line.outcome}>
                <b>{line.n}</b>
                <span>{line.word}</span>
              </li>
            ))}
          </ul>
        )}
      </header>

      <ol className="dl-rules" aria-label="Les règles">
        <li>
          <span className="dl-rules__n">01</span>
          <div>
            <p className="dl-rules__title">Cinq questions, les mêmes pour vous deux</p>
            <p className="dl-rules__text">
              Tirées au hasard des quiz des leçons du parcours choisi.
            </p>
          </div>
        </li>
        <li>
          <span className="dl-rules__n">02</span>
          <div>
            <p className="dl-rules__title">Un jour pour accepter, un jour pour jouer</p>
            <p className="dl-rules__text">
              Passé ce délai, un défi sans réponse expire, et un duel se règle sur les réponses
              données.
            </p>
          </div>
        </li>
        <li>
          <span className="dl-rules__n">03</span>
          <div>
            <p className="dl-rules__title">À égalité, le premier à finir gagne</p>
            <p className="dl-rules__text">
              Le plus de bonnes réponses l&apos;emporte. Une réponse donnée est définitive.
            </p>
          </div>
        </li>
      </ol>

      {invitations.length > 0 ? (
        <section className="dl-section" aria-labelledby="dl-invites-title">
          <div className="dl-sec">
            <h2 id="dl-invites-title" className="dl-sec__title">
              On te défie
            </h2>
            <span className="dl-sec__meta">
              {invitations.length} {plural(invitations.length, "invitation")}
            </span>
          </div>
          <ul className="dl-invites">
            {invitations.map((duel) => (
              <InvitationCard key={duel.id} duel={duel} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="dl-section" aria-labelledby="dl-new-title">
        <div className="dl-sec">
          <h2 id="dl-new-title" className="dl-sec__title">
            Lancer un duel
          </h2>
        </div>
        {friendCount === 0 ? (
          <EmptyState
            title="Pas encore d'ami à défier"
            message="Un duel se joue entre amis : ajoute quelqu'un depuis son profil, ou accepte une demande dans le panneau Amis en haut de page, puis reviens ici."
          />
        ) : (
          <NewDuelForm
            friends={friends}
            paths={paths}
            initialFriend={initialFriend}
            readerInitials={initialsOf(readerName)}
          />
        )}
      </section>

      {/* With no friend and no duel, the panel above already says what to do. */}
      {friendCount > 0 || others.length > 0 ? (
        <section className="dl-section" aria-labelledby="dl-list-title">
          <div className="dl-sec">
            <h2 id="dl-list-title" className="dl-sec__title">
              Tes duels
            </h2>
            {others.length > 0 && (
              <span className="dl-sec__meta">
                {others.length} {plural(others.length, "duel")}
              </span>
            )}
          </div>
          {others.length === 0 ? (
            <EmptyState
              title="Aucun duel pour l'instant"
              message="Choisis un ami et un parcours ci-dessus : ton duel s'affichera ici."
            />
          ) : (
            <ul className="dl-grid">
              {others.map((duel) => (
                <li key={duel.id}>
                  <DuelCard duel={duel} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
