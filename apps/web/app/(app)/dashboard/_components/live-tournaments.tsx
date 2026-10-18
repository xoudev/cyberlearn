import Link from "next/link";
import React from "react";
import { challengesTabHref } from "@cyberlearn/lib/challenges/tabs";
import { elapsedShare, TEAM_SCOPE_LABELS } from "@cyberlearn/lib/challenges/tournament";
import type { TournamentSummary } from "@/lib/tournaments/tournaments";

/**
 * The tournaments under way that the reader is part of, the one closing first
 * first: its title, its format, when it closes, how much of its time has gone
 * by (at the server's clock), and the way in. Drawn only when there is one;
 * the rest, to come or played, is the Tournois tab of the challenges.
 */
export function LiveTournaments({
  tournaments,
  nowMs,
}: {
  tournaments: TournamentSummary[];
  nowMs: number;
}): React.ReactElement {
  return (
    <section className="dash-sec" aria-labelledby="dash-live-title">
      <div className="dash-sec-head">
        <h2 id="dash-live-title">Tournois en cours</h2>
        <Link href={challengesTabHref("tournois")} className="dash-sec-link">
          Tous les tournois
        </Link>
      </div>
      <ul className="dash-live">
        {tournaments.map((t) => {
          const share = Math.floor(elapsedShare(t, nowMs) * 100);
          return (
            <li key={t.id} className="dash-live-item">
              <div className="dash-live-text">
                <b>{t.title}</b>
                <span>
                  {TEAM_SCOPE_LABELS[t.teamScope]} · se termine {t.endsLabel}
                </span>
              </div>
              <div className="dash-live-bar" aria-hidden="true">
                <i style={{ width: `${String(share)}%` }} />
              </div>
              <span className="sr-only">{share}&nbsp;% du temps écoulé</span>
              <Link href={`/tournaments/${t.id}`} className="btn btn--danger btn--sm">
                Entrer<span className="sr-only"> dans le tournoi {t.title}</span>{" "}
                <span aria-hidden="true">→</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
