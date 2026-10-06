import type { Metadata } from "next";
import Link from "next/link";
import React from "react";
import {
  TEAM_SCOPE_LABELS,
  TOURNAMENT_PHASE_LABELS,
  type TournamentPhase,
} from "@cyberlearn/lib/challenges/tournament";
import { Crumb } from "@/components/crumb";
import { requireRequestUser } from "@/lib/auth";
import { listTournamentsFor, type TournamentSummary } from "@/lib/tournaments/tournaments";
import { PHASE_COLOR } from "./_components/phase";

export const metadata: Metadata = { title: "Tournois" };

const PHASE_ORDER: Record<TournamentPhase, number> = { RUNNING: 0, UPCOMING: 1, FINISHED: 2 };

/** Running first, ending soonest; then the next to open; then the last to have closed. */
function byUrgency(a: TournamentSummary, b: TournamentSummary): number {
  if (a.phase !== b.phase) return PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase];
  if (a.phase === "RUNNING") return a.endsAt.localeCompare(b.endsAt);
  if (a.phase === "UPCOMING") return a.startsAt.localeCompare(b.startsAt);
  return b.endsAt.localeCompare(a.endsAt);
}

/**
 * The CTF tournaments the reader's classes take part in: the one running, the
 * ones to come, the ones played. A tournament opens on its own page, with its
 * challenges and its scoreboard.
 */
export default async function TournamentsPage(): Promise<React.ReactElement> {
  const user = await requireRequestUser();
  const tournaments = [...(await listTournamentsFor(user.id))].sort(byUrgency);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", display: "grid", gap: 28 }}>
      <Crumb segments={["tournois"]} />
      <header style={{ display: "grid", gap: 6 }}>
        <h1 style={{ margin: 0 }}>Tournois</h1>
        <p style={{ margin: 0, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          Des défis CTF ouverts le temps d&apos;un tournoi, entre classes ou entre écoles. Un défi
          rapporte ses points à ton équipe la première fois qu&apos;un de ses membres en trouve le
          flag ; ton score à toi compte les flags que tu as trouvés. Le tableau des scores bouge
          pendant la partie.
        </p>
      </header>

      {tournaments.length === 0 ? (
        <p style={{ margin: 0, color: "var(--color-text-muted)", lineHeight: 1.6 }}>
          Aucun tournoi pour l&apos;instant. Un tournoi réunit des classes : quand la tienne en
          rejoint un, il apparaît ici, et une notification te le dit.
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
          {tournaments.map((t) => (
            <li key={t.id}>
              <Link
                href={`/tournaments/${t.id}`}
                className="card"
                style={{ padding: "14px 18px", display: "grid", gap: 6, textDecoration: "none" }}
              >
                <span
                  style={{
                    display: "flex",
                    gap: 12,
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                  }}
                >
                  <strong>{t.title}</strong>
                  <span className="mono-label" style={{ color: PHASE_COLOR[t.phase] }}>
                    {TOURNAMENT_PHASE_LABELS[t.phase]}
                  </span>
                </span>
                <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
                  Du {t.startsLabel} au {t.endsLabel}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--color-text-muted)",
                  }}
                >
                  {TEAM_SCOPE_LABELS[t.teamScope]} · {String(t.classCount)} classe
                  {t.classCount > 1 ? "s" : ""} · {String(t.challengeCount)} défi
                  {t.challengeCount > 1 ? "s" : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
