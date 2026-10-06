import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { tournamentRepository } from "@cyberlearn/db";
import {
  TEAM_SCOPE_LABELS,
  TOURNAMENT_PHASE_LABELS,
  tournamentDateLabel,
  tournamentPhase,
  type TournamentPhase,
} from "@cyberlearn/lib/challenges/tournament";
import { Card, EmptyState, PageHeader, PrimaryLink, Tag, type Tone } from "../_components/admin-ui";
import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Tournois" };

const PHASE_TONE: Record<TournamentPhase, Tone> = {
  UPCOMING: "info",
  RUNNING: "accent",
  FINISHED: "neutral",
};

/** The CTF tournaments, the latest first: when, between whom, how far along. */
export default async function AdminTournamentsPage(): Promise<React.ReactElement> {
  await requireAdminPage();
  const tournaments = await tournamentRepository.listAll();
  const now = new Date();

  return (
    <main className="a-page">
      <PageHeader
        eyebrow="Gamification"
        title="Tournois"
        description="Des défis à flag ouverts sur une période, entre classes ou entre écoles, avec un tableau des scores en direct sur le site et dans l'app."
        actions={<PrimaryLink href="/tournaments/new">Nouveau tournoi</PrimaryLink>}
      />

      {tournaments.length === 0 ? (
        <EmptyState
          title="Aucun tournoi"
          text="Compose le premier : des classes, des défis, une période."
        />
      ) : (
        <Card>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {tournaments.map((t) => {
              const phase = tournamentPhase(t, now);
              return (
                <li key={t.id} style={{ borderBottom: "1px solid #1F1B47" }}>
                  <Link
                    href={`/tournaments/${t.id}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      gap: 12,
                      padding: "14px 18px",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span style={{ display: "grid", gap: 4 }}>
                      <strong>{t.title}</strong>
                      <span className="mono" style={{ fontSize: 11, color: "#8A86A8" }}>
                        Du {tournamentDateLabel(t.startsAt)} au {tournamentDateLabel(t.endsAt)} ·{" "}
                        {TEAM_SCOPE_LABELS[t.teamScope]} · {String(t._count.classes)} classe
                        {t._count.classes > 1 ? "s" : ""} · {String(t._count.challenges)} défi
                        {t._count.challenges > 1 ? "s" : ""} · {String(t._count.solves)} flag
                        {t._count.solves > 1 ? "s" : ""} trouvé{t._count.solves > 1 ? "s" : ""}
                      </span>
                    </span>
                    <Tag tone={PHASE_TONE[phase]}>{TOURNAMENT_PHASE_LABELS[phase]}</Tag>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </main>
  );
}
