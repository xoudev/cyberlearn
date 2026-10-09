"use client";

// "use client" justified: the scoreboard is read again every few seconds while
// the tournament runs, and the countdown ticks every second.

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import {
  challengeState,
  challengeStateLabel,
  challengeTypeLabel,
  countdownLabel,
  counted,
  elapsedShare,
  type StandingFigure,
  standingFigures,
  TEAM_SCOPE_LABELS,
  teamFoundLabel,
  teamsLabel,
  tournamentWinners,
} from "@cyberlearn/lib/challenges/tournament";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";
import { CornerBrackets } from "@/app/_components/corner-brackets";
import type {
  TournamentChallengeRow,
  TournamentPlayerRow,
  TournamentTeamRow,
  TournamentView,
} from "@/lib/tournaments/tournaments";
import { tournamentViewAction } from "../../_actions/tournament-actions";
import {
  IconCheck,
  IconLock,
  LiveTag,
  PhaseBadge,
  Pips,
  Place,
  Redacted,
  SectionHead,
  WindowBar,
} from "../../_components/parts";

/** How often the scoreboard is read again while the tournament runs. */
export const BOARD_REFRESH_MS = 5000;

/** From five minutes before the end, the countdown takes the warning tone, as the exam's timer does. */
const LOW_MS = 5 * 60_000;

/**
 * A tournament as its players see it: when it opens or closes, its challenges
 * once it has started, the teams and the players in order. While it runs, the
 * page reads it again every few seconds, so a flag found in another classroom
 * shows here without a reload; Supabase Realtime is not used, its publication
 * not being versioned with the migrations.
 *
 * Drawn as the challenges' pages are: a hero (the title, its dates, and a
 * briefing with the countdown and the reader's place), the challenges in a
 * grid with the players under them, the teams' ranking in a column beside.
 */
export function TournamentBoard({ initial }: { initial: TournamentView }): React.ReactElement {
  const [view, setView] = useState(initial);
  // The server's clock minus ours, so the countdown follows the server.
  const [skew, setSkew] = useState(() => Date.parse(initial.serverNow) - Date.now());
  const [now, setNow] = useState(() => Date.now() + skew);

  const reload = useCallback(() => {
    void tournamentViewAction(view.id).then((next) => {
      if (next === null) return;
      setView(next);
      setSkew(Date.parse(next.serverNow) - Date.now());
    });
  }, [view.id]);

  const running = view.phase === "RUNNING";
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, BOARD_REFRESH_MS);
    return () => {
      clearInterval(id);
    };
  }, [running, reload]);

  const target =
    view.phase === "UPCOMING"
      ? Date.parse(view.startsAt)
      : view.phase === "RUNNING"
        ? Date.parse(view.endsAt)
        : null;
  useEffect(() => {
    if (target === null) return;
    const id = setInterval(() => {
      const current = Date.now() + skew;
      setNow(current);
      // The start or the end has come: read the tournament once more, which
      // opens its challenges or closes its scores.
      if (current >= target) {
        clearInterval(id);
        reload();
      }
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [target, skew, reload]);

  const remainingMs = target === null ? null : target - now;
  const over = view.phase === "FINISHED";

  return (
    <section aria-label={`Tournoi ${view.title}`} data-phase={view.phase}>
      <div className="trn-hero">
        <div className="trn-hero__main">
          <div className="trn-hero__top">
            <PhaseBadge phase={view.phase} />
            <p className="pg-eyebrow">
              Tournoi · <b>{TEAM_SCOPE_LABELS[view.teamScope]}</b>
            </p>
          </div>
          <h1 className="pg-title trn-hero__title">{view.title}</h1>
          {view.description !== "" ? (
            <p className="pg-lede trn-hero__desc">{view.description}</p>
          ) : null}
          <dl className="trn-meta">
            <div>
              <dt>Début</dt>
              <dd>{view.startsLabel}</dd>
            </div>
            <div>
              <dt>Fin</dt>
              <dd>{view.endsLabel}</dd>
            </div>
            <div>
              <dt>Équipes</dt>
              <dd>{teamsLabel(view.teamScope, view.teams.length, view.classCount)}</dd>
            </div>
            <div>
              <dt>Défis</dt>
              <dd>{view.challengeCount}</dd>
            </div>
          </dl>
        </div>
        <Briefing view={view} remainingMs={remainingMs} share={elapsedShare(view, now)} />
      </div>

      <div className="trn-main">
        <section aria-label="Les défis" className="trn-section trn-main__challenges">
          <Challenges view={view} />
        </section>
        <Teams view={view} />
        {view.phase !== "UPCOMING" ? <Players players={view.players} over={over} /> : null}
      </div>
    </section>
  );
}

// ── The briefing ──────────────────────────────────────────────────────────────

/**
 * The hero's right-hand panel: the time left, big, or the winner once it is
 * over; how much of the window has gone by; where the reader stands.
 */
function Briefing({
  view,
  remainingMs,
  share,
}: {
  view: TournamentView;
  remainingMs: number | null;
  share: number;
}): React.JSX.Element {
  const low = view.phase === "RUNNING" && remainingMs !== null && remainingMs <= LOW_MS;
  const caption =
    view.phase === "RUNNING" ? (
      <>
        <b>{Math.floor(share * 100)}&nbsp;%</b> du temps écoulé
      </>
    ) : view.phase === "UPCOMING" ? (
      "Pas encore commencé"
    ) : (
      "Les scores sont définitifs"
    );
  return (
    <div className="trn-brief">
      <CornerBrackets color="var(--trn-accent)" />
      <div className="trn-brief__head">
        <span>Tournoi · briefing</span>
        <span className="trn-brief__aside">{counted(view.teams.length, "équipe")}</span>
      </div>
      <div className="trn-brief__clock">
        {remainingMs !== null ? (
          <p
            role="timer"
            aria-live="polite"
            className="trn-clock"
            data-low={low ? "true" : undefined}
          >
            <span className="trn-clock__k">
              {view.phase === "UPCOMING" ? "Début dans" : "Fin dans"}
            </span>{" "}
            <span className="trn-clock__v">{countdownLabel(remainingMs)}</span>
          </p>
        ) : (
          <Result teams={view.teams} />
        )}
        <WindowBar share={share} caption={caption} />
      </div>
      <Standing view={view} />
    </div>
  );
}

/** Once it is over: the team at the top of the board, or the teams tied there. */
function Result({ teams }: { teams: readonly TournamentTeamRow[] }): React.JSX.Element {
  const winners = tournamentWinners(teams);
  const [top] = winners;
  if (top === undefined) {
    return (
      <div className="trn-result">
        <span className="trn-clock__k">Résultat</span>
        <p className="trn-result__none">Personne n&apos;a trouvé de flag.</p>
      </div>
    );
  }
  return (
    <div className="trn-result">
      <span className="trn-clock__k">{winners.length > 1 ? "Vainqueurs" : "Vainqueur"}</span>
      <p className="trn-result__name">
        <Place rank={1} scored />
        <span>{winners.map((team) => team.name).join(", ")}</span>
      </p>
      <span className="trn-result__pts">
        {counted(top.points, "point")} · {counted(top.solved, "défi")}
      </span>
    </div>
  );
}

/**
 * Where the reader stands: their team and its place, their own place and
 * score, or why they only watch. Before the start nobody has a flag, so only
 * the team they will play for is said.
 */
function Standing({ view }: { view: TournamentView }): React.JSX.Element {
  if (view.role === "teacher" || view.role === "admin") {
    return (
      <p className="trn-standing trn-standing--note">
        {view.role === "teacher"
          ? "Tu suis ce tournoi comme professeur : tes élèves jouent, tu vois les scores."
          : "Tu vois ce tournoi comme administrateur : il se compose dans la console."}
      </p>
    );
  }
  if (view.myTeam === null) {
    return (
      <p className="trn-standing trn-standing--note">
        Ta classe ne joue plus : les scores restent lisibles.
      </p>
    );
  }
  if (view.phase === "UPCOMING") {
    return (
      <div className="trn-standing" role="group" aria-label="Ta place">
        <p className="trn-standing__team">
          Tu joueras pour <strong>{view.myTeam}</strong>
        </p>
      </div>
    );
  }
  const figures = standingFigures(view);
  return (
    <div className="trn-standing" role="group" aria-label="Ta place">
      <p className="trn-standing__team">
        {view.phase === "FINISHED" ? "Tu as joué pour" : "Tu joues pour"}{" "}
        <strong>{view.myTeam}</strong>
      </p>
      {figures !== null ? (
        <dl className="trn-standing__stats">
          {figures.map((figure) => (
            <StandingStat key={figure.key} figure={figure} />
          ))}
        </dl>
      ) : null}
    </div>
  );
}

/**
 * One of the reader's figures: a place with what it is counted among, a dash
 * with why there is none, or a count and its unit.
 */
function StandingStat({ figure }: { figure: StandingFigure }): React.JSX.Element {
  const place = figure.key === "team" || figure.key === "place";
  return (
    <div
      className={place ? "trn-standing__rank" : undefined}
      data-team={figure.key === "team" ? "true" : undefined}
    >
      <dt>{figure.label}</dt>
      {figure.value === null ? (
        <dd data-empty="true">
          –<small>{figure.note}</small>
        </dd>
      ) : place ? (
        <dd>
          {figure.value}
          {figure.note !== null ? <small>{figure.note}</small> : null}
        </dd>
      ) : (
        <dd>
          <b>{figure.value}</b> {figure.unit}
        </dd>
      )}
    </div>
  );
}

// ── The challenges ────────────────────────────────────────────────────────────

/** The grid of challenges once it has started; before, one sealed card for each. */
function Challenges({ view }: { view: TournamentView }): React.JSX.Element {
  if (view.phase === "UPCOMING") {
    return (
      <>
        <SectionHead title="Défis" meta={counted(view.challengeCount, "défi")} />
        <p className="trn-section__note">
          {view.challengeCount > 1
            ? `Les ${String(view.challengeCount)} défis s'ouvrent au début du tournoi.`
            : "Le défi s'ouvre au début du tournoi."}
        </p>
        <ul className="trn-grid" aria-hidden="true">
          {Array.from({ length: view.challengeCount }, (_, i) => (
            <li key={i}>
              <LockedCard n={i + 1} />
            </li>
          ))}
        </ul>
      </>
    );
  }
  const total = view.challenges.length;
  const teamSolved = view.challenges.filter((c) => c.solvedByMyTeam).length;
  return (
    <>
      <SectionHead
        title="Défis"
        meta={view.myTeam !== null ? teamFoundLabel(teamSolved, total) : counted(total, "défi")}
      />
      <ul className="trn-grid">
        {view.challenges.map((c) => (
          <li key={c.id}>
            <ChallengeCard
              tournamentId={view.id}
              c={c}
              myTeam={view.myTeam}
              over={view.phase === "FINISHED"}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * One challenge, the whole card a link: its domain, its difficulty, its
 * points in big, and where it stands (found by the reader, by their team,
 * by others, by nobody yet), with the team that found it first.
 */
function ChallengeCard({
  tournamentId,
  c,
  myTeam,
  over,
}: {
  tournamentId: string;
  c: TournamentChallengeRow;
  myTeam: string | null;
  /** The tournament is over: a challenge nobody found is no longer a call to play. */
  over: boolean;
}): React.JSX.Element {
  const state = challengeState(c);
  const diff = difficultyMeta(c.difficulty);
  return (
    <Link
      href={`/tournaments/${tournamentId}/${c.slug}`}
      className="trn-ch"
      data-state={state}
      data-over={over ? "true" : undefined}
      data-cat={c.category}
    >
      <div className="trn-ch__top">
        <span className="trn-ch__cat">{categoryMeta(c.category).short}</span>
        <span>{challengeTypeLabel(c.type)}</span>
      </div>
      <div className="trn-ch__body">
        <div>
          <h3 className="trn-ch__title">{c.title}</h3>
          <span className="trn-ch__diff">
            <Pips level={diff.level} />
            {diff.label}
          </span>
        </div>
        <span className="trn-ch__pts">
          <b>{c.points}</b> pts
        </span>
      </div>
      <div className="trn-ch__foot">
        <span className="trn-ch__state">
          {state === "mine" || state === "team" ? <IconCheck /> : null}
          {challengeStateLabel(c, over)}
        </span>
        {c.firstTeam !== null ? (
          <span
            className="trn-ch__first"
            data-mine={myTeam !== null && c.firstTeam === myTeam ? "true" : undefined}
          >
            premier : <b>{c.firstTeam}</b>
          </span>
        ) : null}
      </div>
    </Link>
  );
}

/** A challenge before the start: there, numbered, its content withheld. */
function LockedCard({ n }: { n: number }): React.JSX.Element {
  return (
    <div className="trn-ch trn-ch--locked">
      <div className="trn-ch__top">
        <span className="trn-ch__cat">
          <IconLock />
          Verrouillé
        </span>
        <span>Défi {String(n).padStart(2, "0")}</span>
      </div>
      <div className="trn-ch__body">
        <Redacted widths={["88%", "56%"]} />
        <span className="trn-ch__pts-hidden" />
      </div>
      <div className="trn-ch__foot">
        <span className="trn-ch__state">S&apos;ouvre au début</span>
      </div>
    </div>
  );
}

// ── The rankings ──────────────────────────────────────────────────────────────

/**
 * The teams in order, each with its place, its points and a bar of them
 * against the leader's; the reader's own team said so.
 */
function Teams({ view }: { view: TournamentView }): React.JSX.Element {
  const scored = view.teams.some((team) => team.points > 0);
  const leader = Math.max(0, ...view.teams.map((team) => team.points));
  return (
    <section aria-label="Les équipes" className="trn-section trn-main__teams">
      <SectionHead
        title={view.teamScope === "CLASS" ? "Classement des classes" : "Classement des écoles"}
        meta={view.phase === "RUNNING" ? <LiveTag /> : undefined}
      />
      <ol className="trn-teams">
        {view.teams.map((team) => (
          <TeamRow
            key={team.name + team.detail}
            team={team}
            ranked={scored}
            share={leader > 0 ? team.points / leader : 0}
          />
        ))}
      </ol>
    </section>
  );
}

/**
 * One team of the ranking: its place (none while nobody has scored), its
 * name and what it is made of, its points and flags, its bar.
 */
function TeamRow({
  team,
  ranked,
  share,
}: {
  team: TournamentTeamRow;
  /** Some team has scored: the places mean something. */
  ranked: boolean;
  /** Its points against the leader's, from 0 to 1. */
  share: number;
}): React.JSX.Element {
  return (
    <li className="trn-team" aria-current={team.isMine ? "true" : undefined}>
      <Place rank={team.rank} scored={team.points > 0} ranked={ranked} />
      <span className="trn-team__who">
        <span className="trn-team__line">
          <strong className="trn-team__name">{team.name}</strong>
          {team.isMine ? <span className="trn-you">Ton équipe</span> : null}
        </span>
        <span className="trn-team__detail">{team.detail}</span>
      </span>
      <span className="trn-team__score">
        <b>{team.points}</b> pts
        <small>{counted(team.solved, "défi")}</small>
      </span>
      <span className="trn-team__bar" aria-hidden="true">
        <i style={{ width: `${(share * 100).toFixed(1)}%` }} />
      </span>
    </li>
  );
}

/** The first players by their own points, the reader marked; who is named, and why. */
function Players({
  players,
  over,
}: {
  players: readonly TournamentPlayerRow[];
  /** The tournament is over: nobody will find a flag any more. */
  over: boolean;
}): React.JSX.Element {
  return (
    <section aria-label="Les joueurs" className="trn-section trn-main__players">
      <SectionHead title="Joueurs" />
      {players.length === 0 ? (
        <p className="trn-section__note">
          {over ? "Personne n'a trouvé de flag." : "Personne n'a encore trouvé de flag."}
        </p>
      ) : (
        <ol className="trn-players">
          {players.map((player) => (
            <li
              key={`${String(player.rank)}-${player.name}-${player.team}`}
              className="trn-player"
              aria-current={player.isMe ? "true" : undefined}
            >
              <Place rank={player.rank} scored className="trn-player__place" />
              <span className="trn-player__who">
                <span className="trn-player__name">{player.name}</span>
                {player.isMe ? <span className="trn-you">Toi</span> : null}
                <span className="trn-player__team">{player.team}</span>
              </span>
              <span className="trn-player__pts">
                <b>{player.points}</b> pts
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="trn-footnote">
        Un joueur apparaît sous son nom s&apos;il l&apos;a choisi pour le classement, anonyme sinon,
        et pas du tout s&apos;il s&apos;en est masqué ; ses flags comptent pour son équipe dans tous
        les cas.
      </p>
    </section>
  );
}
