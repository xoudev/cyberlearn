import Link from "next/link";
import React from "react";
import {
  byUrgency,
  counted,
  durationLabel,
  elapsedShare,
  phaseTallyWord,
  TEAM_SCOPE_LABELS,
  type TournamentPhase,
} from "@cyberlearn/lib/challenges/tournament";
import { Crumb } from "@/components/crumb";
import { EmptyState } from "@/components/empty-state";
import type { TournamentSummary } from "@/lib/tournaments/tournaments";
import { PhaseBadge, SectionHead, WindowBar } from "./parts";
import { datePlate } from "./phase";

/** How long a tournament stays open: "2 h", "3 jours". */
function lengthOf(t: TournamentSummary): string {
  return durationLabel(Date.parse(t.endsAt) - Date.parse(t.startsAt));
}

/**
 * A tournament under way, as wide as the page: what it is, how much of its
 * window has gone by (at the server's clock), and the way in.
 */
function LivePanel({ t, nowMs }: { t: TournamentSummary; nowMs: number }): React.JSX.Element {
  const share = elapsedShare(t, nowMs);
  return (
    <section className="trn-live" data-phase={t.phase} aria-labelledby={`trn-live-${t.id}`}>
      <div className="trn-live__main">
        <div className="trn-live__top">
          <PhaseBadge phase={t.phase} />
          <span className="trn-live__scope">{TEAM_SCOPE_LABELS[t.teamScope]}</span>
        </div>
        <h2 id={`trn-live-${t.id}`} className="trn-live__title">
          {t.title}
        </h2>
        <p className="trn-live__dates">
          Du {t.startsLabel} au {t.endsLabel}
        </p>
        <WindowBar
          share={share}
          caption={
            <>
              <b>{Math.floor(share * 100)}&nbsp;%</b> du temps écoulé
            </>
          }
        />
        <div className="trn-live__cta">
          <Link href={`/tournaments/${t.id}`} className="btn btn--danger btn--lg">
            Entrer dans le tournoi<span className="sr-only"> {t.title}</span>{" "}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
      <dl className="trn-live__side">
        <div>
          <dt>Classes</dt>
          <dd>{t.classCount}</dd>
        </div>
        <div>
          <dt>Défis</dt>
          <dd>{t.challengeCount}</dd>
        </div>
        <div>
          <dt>Durée</dt>
          <dd className="trn-live__len">{lengthOf(t)}</dd>
        </div>
      </dl>
    </section>
  );
}

/**
 * A tournament to come or already played: the day it opens or closed on a
 * calendar plate, its title, its format, the way to its page.
 */
function TournamentCard({ t }: { t: TournamentSummary }): React.JSX.Element {
  const upcoming = t.phase === "UPCOMING";
  const plate = datePlate(upcoming ? t.startsAt : t.endsAt);
  return (
    <article className="trn-card" data-phase={t.phase}>
      <div className="trn-card__head">
        <span className="trn-date" aria-hidden="true">
          <span className="trn-date__day">{plate.day}</span>
          <span className="trn-date__month">{plate.month}</span>
        </span>
        <span className="trn-card__headtext">
          <PhaseBadge phase={t.phase} />
          <span className="trn-card__time" aria-hidden="true">
            {plate.weekday} · {plate.time}
          </span>
        </span>
      </div>
      <div className="trn-card__body">
        <h3 className="trn-card__title">{t.title}</h3>
        <p className="trn-card__when">
          {upcoming ? `Début : ${t.startsLabel}` : `Terminé le ${t.endsLabel}`}
        </p>
        <p className="trn-card__meta">
          <span>{TEAM_SCOPE_LABELS[t.teamScope]}</span>
          <span>{counted(t.classCount, "classe")}</span>
          <span>{counted(t.challengeCount, "défi")}</span>
          <span>{lengthOf(t)} de jeu</span>
        </p>
      </div>
      <Link href={`/tournaments/${t.id}`} className="trn-card__go">
        {upcoming ? "Voir le tournoi" : "Voir les scores"}
        <span className="sr-only"> : {t.title}</span> <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}

/** How a tournament is scored, in three steps. */
function Steps(): React.JSX.Element {
  return (
    <ol className="trn-steps">
      <li>
        <span className="trn-steps__n">01</span>
        <div>
          <h2>Un flag, des points</h2>
          <p>
            Un défi rapporte ses points à ton équipe la première fois qu&apos;un de ses membres en
            trouve le flag.
          </p>
        </div>
      </li>
      <li>
        <span className="trn-steps__n">02</span>
        <div>
          <h2>Ton score à toi</h2>
          <p>Il compte les flags que tu as trouvés toi-même, que ton équipe les ait déjà ou non.</p>
        </div>
      </li>
      <li>
        <span className="trn-steps__n">03</span>
        <div>
          <h2>Un tableau en direct</h2>
          <p>
            Les scores bougent pendant la partie. À points égaux, l&apos;équipe arrivée la première
            passe devant.
          </p>
        </div>
      </li>
    </ol>
  );
}

/**
 * The CTF tournaments the reader's classes take part in: the one running, the
 * ones to come, the ones played. A tournament under way comes first, before
 * the steps that explain the scoring: it is what the page is opened for. The
 * list is sorted here; `nowMs` is the server's clock, which the window bars
 * of the running tournaments are measured against.
 */
export function TournamentsList({
  tournaments,
  nowMs,
}: {
  tournaments: readonly TournamentSummary[];
  nowMs: number;
}): React.JSX.Element {
  const sorted = [...tournaments].sort(byUrgency);
  const of = (phase: TournamentPhase): TournamentSummary[] =>
    sorted.filter((t) => t.phase === phase);
  const running = of("RUNNING");
  const upcoming = of("UPCOMING");
  const finished = of("FINISHED");
  const tally = [
    { phase: "RUNNING", n: running.length },
    { phase: "UPCOMING", n: upcoming.length },
    { phase: "FINISHED", n: finished.length },
  ] as const;

  return (
    <div className="page-container trn">
      <header className="trn-head">
        <div>
          <Crumb segments={["tournois"]} />
          <p className="pg-eyebrow">
            <b>CTF</b> en équipe
          </p>
          <h1 className="pg-title">Tournois</h1>
          <p className="pg-lede">
            Des défis CTF ouverts le temps d&apos;un tournoi, entre classes ou entre écoles. Tu
            joues pour ton équipe : ta classe, ou ton école.
          </p>
        </div>
        {sorted.length > 0 && (
          <ul className="trn-tally" aria-label="Les tournois">
            {tally.map(({ phase, n }) => (
              <li key={phase} data-phase={phase}>
                <b>{n}</b>
                {phaseTallyWord(phase, n)}
              </li>
            ))}
          </ul>
        )}
      </header>

      {running.length > 0 && (
        <div className="trn-featured">
          {running.map((t) => (
            <LivePanel key={t.id} t={t} nowMs={nowMs} />
          ))}
        </div>
      )}

      <Steps />

      {sorted.length === 0 ? (
        <EmptyState
          title="Aucun tournoi pour l'instant"
          message="Un tournoi réunit des classes : quand la tienne en rejoint un, il apparaît ici, et une notification te le dit."
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="trn-group" aria-labelledby="trn-upcoming">
              <SectionHead
                id="trn-upcoming"
                title="À venir"
                meta={counted(upcoming.length, "tournoi")}
              />
              <div className="trn-cards">
                {upcoming.map((t) => (
                  <TournamentCard key={t.id} t={t} />
                ))}
              </div>
            </section>
          )}

          {finished.length > 0 && (
            <section className="trn-group" aria-labelledby="trn-finished">
              <SectionHead
                id="trn-finished"
                title="Terminés"
                meta={counted(finished.length, "tournoi")}
              />
              <div className="trn-cards">
                {finished.map((t) => (
                  <TournamentCard key={t.id} t={t} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
