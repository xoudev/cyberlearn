import type { Metadata } from "next";
import React from "react";
import { requireRequestUser } from "@/lib/auth";
import { listTournamentsFor } from "@/lib/tournaments/tournaments";
import { TournamentsList } from "./_components/tournaments-list";
import "./_components/tournaments.css";

export const metadata: Metadata = { title: "Tournois" };

/**
 * The CTF tournaments the reader's classes take part in. A tournament opens
 * on its own page, with its challenges and its scoreboard.
 */
export default async function TournamentsPage(): Promise<React.ReactElement> {
  const user = await requireRequestUser();
  const tournaments = await listTournamentsFor(user.id);
  return <TournamentsList tournaments={tournaments} nowMs={Date.now()} />;
}
