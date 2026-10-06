import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { tournamentRepository } from "@cyberlearn/db";
import {
  dateToParisLocal,
  placeLabel,
  teamStandings,
  TOURNAMENT_PHASE_LABELS,
  tournamentPhase,
  tournamentTeams,
  type TournamentPhase,
} from "@cyberlearn/lib/challenges/tournament";
import { Card, GhostLink, PageHeader, Tag, type Tone } from "../../_components/admin-ui";
import { updateTournamentAction } from "../_actions/tournament-actions";
import { TournamentControls } from "../_components/tournament-controls";
import { TournamentForm } from "../_components/tournament-form";
import { tournamentOptions } from "../_components/tournament-options";
import { requireAdminPage } from "@/lib/auth";
import { learnerUrl } from "@/lib/learner-url";

export const metadata: Metadata = { title: "Tournoi" };

interface Props {
  params: Promise<{ id: string }>;
}

const PHASE_TONE: Record<TournamentPhase, Tone> = {
  UPCOMING: "info",
  RUNNING: "accent",
  FINISHED: "neutral",
};

/** The page on the site, or null when the console does not know where the site is. */
function siteLink(id: string): string | null {
  try {
    return learnerUrl(`/tournaments/${id}`);
  } catch {
    return null;
  }
}

/**
 * One tournament in the console: its standing by team, its form (open before
 * the start, narrower after), deleting or ending it.
 */
export default async function AdminTournamentPage({ params }: Props): Promise<React.ReactElement> {
  await requireAdminPage();
  const { id } = await params;
  if (!z.guid().safeParse(id).success) notFound();
  const [edited, tournament, options] = await Promise.all([
    tournamentRepository.findForConsole(id),
    tournamentRepository.findById(id),
    tournamentOptions(),
  ]);
  if (edited === null || tournament === null) notFound();

  const now = new Date();
  const phase = tournamentPhase(edited, now);
  const classIds = edited.classes.map((c) => c.classId);
  const [solves, headStart] = await Promise.all([
    // None before the start: a solve is only recorded while the tournament runs.
    tournamentRepository.listSolves(id),
    tournamentRepository.catalogueSolvesAmong(
      edited.challenges.map((c) => c.challengeId),
      classIds,
    ),
  ]);

  const { teams, teamOfClass } = tournamentTeams(
    tournament.teamScope,
    tournament.classes.map(({ class: c }) => ({
      id: c.id,
      name: c.name,
      schoolId: c.promotion.establishment.id,
      schoolName: c.promotion.establishment.name,
    })),
  );
  const standings = teamStandings(
    teams.map((t) => t.id),
    solves.flatMap((s) => {
      const teamId = teamOfClass.get(s.classId);
      return teamId === undefined ? [] : [{ ...s, teamId }];
    }),
  );
  const nameOf = new Map(teams.map((t) => [t.id, t.name]));
  const link = siteLink(id);

  // A class archived since it joined is still part of the tournament; the
  // form lists only live classes, so it is added back for this one.
  const formClasses = [...options.classes];
  for (const { class: c } of tournament.classes) {
    if (!formClasses.some((o) => o.id === c.id)) {
      formClasses.push({
        id: c.id,
        name: c.name,
        school: c.promotion.establishment.name,
        promotion: c.promotion.name,
      });
    }
  }

  return (
    <main className="a-page">
      <PageHeader
        eyebrow="Tournois"
        title={edited.title}
        description={`${String(edited._count.solves)} flag${edited._count.solves > 1 ? "s" : ""} trouvé${edited._count.solves > 1 ? "s" : ""}.`}
        actions={
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Tag tone={PHASE_TONE[phase]}>{TOURNAMENT_PHASE_LABELS[phase]}</Tag>
            {link !== null ? <GhostLink href={link}>Voir sur le site</GhostLink> : null}
            <TournamentControls tournamentId={id} phase={phase} />
          </div>
        }
      />

      {phase !== "UPCOMING" ? (
        <Card
          title={edited.teamScope === "CLASS" ? "Classement des classes" : "Classement des écoles"}
          pad
        >
          <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
            {standings.map((s) => (
              <li
                key={s.teamId}
                style={{ display: "grid", gridTemplateColumns: "48px 1fr auto", gap: 12 }}
              >
                <span className="mono">{placeLabel(s.rank)}</span>
                <span>{nameOf.get(s.teamId)}</span>
                <span className="mono">
                  {String(s.points)} pts · {String(s.solved)} défi{s.solved > 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      <TournamentForm
        phase={phase}
        initial={{
          title: edited.title,
          description: edited.description,
          startsAt: dateToParisLocal(edited.startsAt),
          endsAt: dateToParisLocal(edited.endsAt),
          teamScope: edited.teamScope,
          classIds,
          challenges: edited.challenges,
        }}
        classes={formClasses}
        challenges={options.challenges}
        headStart={Object.fromEntries(headStart)}
        action={updateTournamentAction.bind(null, id)}
        submitLabel="Enregistrer"
      />
    </main>
  );
}
