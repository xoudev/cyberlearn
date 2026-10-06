import type { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";
import { Crumb } from "@/components/crumb";
import { requireRequestUser } from "@/lib/auth";
import { tournamentViewFor } from "@/lib/tournaments/tournaments";
import { TournamentBoard } from "./_components/tournament-board";

export const metadata: Metadata = { title: "Tournoi" };

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * A tournament, for the members of its classes, their teachers and an admin:
 * not found for anybody else.
 */
export default async function TournamentPage({ params }: Props): Promise<React.ReactElement> {
  const { id } = await params;
  const user = await requireRequestUser();
  const view = await tournamentViewFor(user.id, id);
  if (view === null) notFound();

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", display: "grid", gap: 24 }}>
      <Crumb segments={[{ label: "tournois", href: "/tournaments" }, view.title]} />
      <TournamentBoard initial={view} />
    </div>
  );
}
