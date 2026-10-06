"use client";

// "use client" justified: the scoreboard is read again every few seconds while
// the tournament runs, and the countdown ticks every second.

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import {
  countdownLabel,
  placeLabel,
  TEAM_SCOPE_LABELS,
  TOURNAMENT_PHASE_LABELS,
} from "@cyberlearn/lib/challenges/tournament";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";
import type { TournamentView } from "@/lib/tournaments/tournaments";
import { tournamentViewAction } from "../../_actions/tournament-actions";
import { PHASE_COLOR } from "../../_components/phase";

/**
 * A tournament as its players see it: when it opens or closes, its challenges
 * once it has started, the teams and the players in order. While it runs, the
 * page reads it again every few seconds, so a flag found in another classroom
 * shows here without a reload; Supabase Realtime is not used, its publication
 * not being versioned with the migrations.
 */

const MONO = "var(--font-mono, monospace)";
/** How often the scoreboard is read again while the tournament runs. */
export const BOARD_REFRESH_MS = 5000;

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

  const remaining = target === null ? null : countdownLabel(target - now);

  return (
    <section aria-label={`Tournoi ${view.title}`} style={{ display: "grid", gap: 24 }}>
      <header style={{ display: "grid", gap: 8 }}>
        <span className="mono-label" style={{ color: PHASE_COLOR[view.phase] }}>
          {"// "}Tournoi · {TOURNAMENT_PHASE_LABELS[view.phase]}
        </span>
        <h1 style={{ margin: 0 }}>{view.title}</h1>
        {view.description !== "" ? (
          <p style={{ margin: 0, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            {view.description}
          </p>
        ) : null}
        <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
          Du {view.startsLabel} au {view.endsLabel} · {TEAM_SCOPE_LABELS[view.teamScope]}
        </span>
        {remaining !== null ? (
          <span aria-live="polite" style={{ fontFamily: MONO, color: PHASE_COLOR[view.phase] }}>
            {view.phase === "UPCOMING" ? "Début dans " : "Fin dans "}
            {remaining}
          </span>
        ) : null}
      </header>

      <Standing view={view} />

      <section aria-label="Les défis" style={{ display: "grid", gap: 10 }}>
        <span className="mono-label" style={{ color: "var(--color-text-muted)" }}>
          {"// "}Défis
        </span>
        {view.phase === "UPCOMING" ? (
          <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
            {view.challengeCount > 1
              ? `Les ${String(view.challengeCount)} défis s'ouvrent au début du tournoi.`
              : "Le défi s'ouvre au début du tournoi."}
          </p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
            {view.challenges.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/tournaments/${view.id}/${c.slug}`}
                  className="card"
                  style={{
                    padding: "12px 16px",
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    gap: 12,
                    alignItems: "center",
                    textDecoration: "none",
                    borderLeft: c.solvedByMe
                      ? "3px solid var(--cosmetic-accent)"
                      : c.solvedByMyTeam
                        ? "3px solid var(--color-info)"
                        : undefined,
                  }}
                >
                  <span style={{ display: "grid", gap: 4 }}>
                    <strong>{c.title}</strong>
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      {categoryMeta(c.category).short} · {difficultyMeta(c.difficulty).label}
                      {" · "}
                      {c.solvedByMe
                        ? "trouvé par toi"
                        : c.solvedByMyTeam
                          ? "trouvé par ton équipe"
                          : c.solveCount > 0
                            ? `${String(c.solveCount)} flag${c.solveCount > 1 ? "s" : ""} trouvé${c.solveCount > 1 ? "s" : ""}`
                            : "pas encore trouvé"}
                      {c.firstTeam !== null ? ` · premier : ${c.firstTeam}` : ""}
                    </span>
                  </span>
                  <span style={{ fontFamily: MONO, color: "var(--cosmetic-accent)" }}>
                    {String(c.points)} pts
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Les équipes" style={{ display: "grid", gap: 10 }}>
        <span className="mono-label" style={{ color: "var(--color-text-muted)" }}>
          {"// "}
          {view.teamScope === "CLASS" ? "Classement des classes" : "Classement des écoles"}
        </span>
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
          {view.teams.map((team) => (
            <li
              key={team.name + team.detail}
              className="card"
              aria-current={team.isMine ? "true" : undefined}
              style={{
                padding: "10px 16px",
                display: "grid",
                gridTemplateColumns: "48px minmax(0, 1fr) auto",
                gap: 12,
                alignItems: "center",
                borderLeft: team.isMine ? "3px solid var(--cosmetic-accent)" : undefined,
              }}
            >
              <span style={{ fontFamily: MONO, color: "var(--color-text-muted)" }}>
                {placeLabel(team.rank)}
              </span>
              <span style={{ display: "grid", gap: 2 }}>
                <strong>{team.name}</strong>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  {team.detail}
                </span>
              </span>
              <span style={{ fontFamily: MONO, textAlign: "right" }}>
                {String(team.points)} pts
                <span style={{ display: "block", fontSize: 11, color: "var(--color-text-muted)" }}>
                  {String(team.solved)} défi{team.solved > 1 ? "s" : ""}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {view.phase !== "UPCOMING" ? (
        <section aria-label="Les joueurs" style={{ display: "grid", gap: 10 }}>
          <span className="mono-label" style={{ color: "var(--color-text-muted)" }}>
            {"// "}Joueurs
          </span>
          {view.players.length === 0 ? (
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              Personne n&apos;a encore trouvé de flag.
            </p>
          ) : (
            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
              {view.players.map((player) => (
                <li
                  key={`${String(player.rank)}-${player.name}-${player.team}`}
                  aria-current={player.isMe ? "true" : undefined}
                  style={{
                    padding: "6px 12px",
                    display: "grid",
                    gridTemplateColumns: "48px minmax(0, 1fr) auto",
                    gap: 12,
                    fontWeight: player.isMe ? 700 : 400,
                    background: player.isMe ? "var(--color-bg-elevated)" : undefined,
                  }}
                >
                  <span style={{ fontFamily: MONO, color: "var(--color-text-muted)" }}>
                    {placeLabel(player.rank)}
                  </span>
                  <span>
                    {player.isMe ? "Toi" : player.name}
                    <span style={{ color: "var(--color-text-muted)" }}> · {player.team}</span>
                  </span>
                  <span style={{ fontFamily: MONO }}>{String(player.points)} pts</span>
                </li>
              ))}
            </ol>
          )}
          <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-muted)" }}>
            Un joueur apparaît sous son nom s&apos;il l&apos;a choisi pour le classement, anonyme
            sinon, et pas du tout s&apos;il s&apos;en est masqué ; ses flags comptent pour son
            équipe dans tous les cas.
          </p>
        </section>
      ) : null}
    </section>
  );
}

/** Where the reader stands: their team and their score, or why they only watch. */
function Standing({ view }: { view: TournamentView }): React.ReactElement {
  if (view.role === "teacher" || view.role === "admin") {
    return (
      <p className="card" style={{ margin: 0, padding: "12px 16px" }}>
        {view.role === "teacher"
          ? "Tu suis ce tournoi comme professeur : tes élèves jouent, tu vois les scores."
          : "Tu vois ce tournoi comme administrateur : il se compose dans la console."}
      </p>
    );
  }
  if (view.myTeam === null) {
    return (
      <p className="card" style={{ margin: 0, padding: "12px 16px" }}>
        Ta classe ne joue plus : les scores restent lisibles.
      </p>
    );
  }
  return (
    <div
      className="card"
      aria-label="Ta place"
      style={{ padding: "12px 16px", display: "flex", gap: 16, flexWrap: "wrap" }}
    >
      <span style={{ flex: 1, minWidth: 200 }}>
        Tu joues pour <strong>{view.myTeam}</strong>.
      </span>
      {view.me !== null ? (
        <span style={{ fontFamily: MONO }}>
          {String(view.me.points)} pts · {String(view.me.solved)} flag
          {view.me.solved > 1 ? "s" : ""}
          {view.me.rank !== null ? ` · ${placeLabel(view.me.rank)}` : ""}
        </span>
      ) : null}
    </div>
  );
}
