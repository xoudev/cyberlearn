import type { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";
import { machineFilesWithFlag, parseChallengeMachine } from "@cyberlearn/types";
import { requireRequestUser } from "@/lib/auth";
import { personalFlag } from "@/lib/challenges/flag";
import { env } from "@/lib/env";
import { tournamentChallengeFor } from "@/lib/tournaments/tournaments";
import { TournamentChallenge, type TournamentMachine } from "./_components/tournament-challenge";
import "../../_components/tournaments.css";

export const metadata: Metadata = { title: "Défi de tournoi" };

interface Props {
  params: Promise<{ id: string; slug: string }>;
}

/**
 * One challenge of a tournament, for the members of its classes, their
 * teachers and an admin: not found before the start, nor for anybody else.
 * The page builds the challenge's machine with the player's own flag; the
 * rest is TournamentChallenge's.
 */
export default async function TournamentChallengePage({
  params,
}: Props): Promise<React.ReactElement> {
  const { id, slug } = await params;
  const user = await requireRequestUser();
  const page = await tournamentChallengeFor(user.id, id, slug);
  if (page === null) notFound();
  const { tournament, challenge, solved } = page;

  // The machine, with the player's own flag where the author wrote {{FLAG}},
  // exactly as the catalogue hands it out (challenges/[slug]/page.tsx).
  const parsed = page.machine === null ? null : parseChallengeMachine(page.machine);
  const flagSecret = env.CHALLENGE_FLAG_SECRET;
  const machine: TournamentMachine | null =
    parsed?.ok === true && flagSecret !== undefined
      ? {
          title: parsed.machine.title ?? challenge.title,
          files: machineFilesWithFlag(
            parsed.machine,
            personalFlag(flagSecret, challenge.id, user.id),
          ),
        }
      : null;

  return (
    <TournamentChallenge
      tournament={tournament}
      challenge={challenge}
      solved={solved}
      machine={machine}
    />
  );
}
