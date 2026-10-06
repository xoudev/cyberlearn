import React from "react";
import type { Metadata } from "next";
import { PageHeader } from "../../_components/admin-ui";
import { createTournamentAction } from "../_actions/tournament-actions";
import { TournamentForm } from "../_components/tournament-form";
import { tournamentOptions } from "../_components/tournament-options";
import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Nouveau tournoi" };

/** Composing a tournament: a period, classes, challenges. Its classes are told at once. */
export default async function NewTournamentPage(): Promise<React.ReactElement> {
  await requireAdminPage();
  const { classes, challenges } = await tournamentOptions();

  return (
    <main className="a-page">
      <PageHeader
        eyebrow="Tournois"
        title="Nouveau tournoi"
        description="Les élèves des classes choisies reçoivent une notification dès l'enregistrement ; les défis restent cachés jusqu'au début."
      />
      <TournamentForm
        phase="UPCOMING"
        initial={{
          title: "",
          description: "",
          startsAt: "",
          endsAt: "",
          teamScope: "CLASS",
          classIds: [],
          challenges: [],
        }}
        classes={classes}
        challenges={challenges}
        action={createTournamentAction}
        submitLabel="Créer le tournoi"
      />
    </main>
  );
}
