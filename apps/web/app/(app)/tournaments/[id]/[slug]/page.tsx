import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import React from "react";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";
import { machineFilesWithFlag, parseChallengeMachine } from "@cyberlearn/types";
import { LinuxTerminal } from "@/app/(app)/lessons/[slug]/_components/linux-terminal";
import { CopyButton } from "@/components/copy-button";
import { Crumb } from "@/components/crumb";
import { requireRequestUser } from "@/lib/auth";
import { personalFlag } from "@/lib/challenges/flag";
import { env } from "@/lib/env";
import { tournamentChallengeFor } from "@/lib/tournaments/tournaments";
import { TournamentFlagForm } from "./_components/tournament-flag-form";
import { TournamentScript } from "./_components/tournament-script";

export const metadata: Metadata = { title: "Défi de tournoi" };

interface Props {
  params: Promise<{ id: string; slug: string }>;
}

/**
 * One challenge of a tournament: its statement, its machine or its Python
 * runner as in the catalogue, and a flag that counts for the tournament.
 * Hidden before the start; readable, without a flag, once it is over.
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
  const machine = page.machine === null ? null : parseChallengeMachine(page.machine);
  const flagSecret = env.CHALLENGE_FLAG_SECRET;
  const machineFiles =
    machine?.ok === true && flagSecret !== undefined
      ? machineFilesWithFlag(machine.machine, personalFlag(flagSecret, challenge.id, user.id))
      : null;

  const notice =
    tournament.phase === "FINISHED"
      ? "Le tournoi est terminé : les flags ne comptent plus."
      : tournament.canPlay
        ? null
        : "Seuls les élèves des classes du tournoi y donnent un flag.";

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", display: "grid", gap: 24 }}>
      <Crumb
        segments={[
          { label: "tournois", href: "/tournaments" },
          { label: tournament.title, href: `/tournaments/${tournament.id}` },
          challenge.slug,
        ]}
      />

      <header style={{ display: "grid", gap: 8 }}>
        <span className="mono-label" style={{ color: "var(--color-danger)" }}>
          {"// "}
          {categoryMeta(challenge.category).short} · {difficultyMeta(challenge.difficulty).label} ·{" "}
          {String(challenge.points)} points
        </span>
        <h1 style={{ margin: 0 }}>{challenge.title}</h1>
        <p style={{ margin: 0, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          {challenge.description}
        </p>
        <Link
          href={`/tournaments/${tournament.id}`}
          className="btn btn--ghost btn--sm"
          style={{ justifySelf: "start" }}
        >
          ← Le tableau des scores
        </Link>
      </header>

      <section aria-label="Instructions" className="challenge-instructions">
        <MDXRemote
          source={challenge.instructions}
          options={{ mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeHighlight] } }}
        />
      </section>

      {machine !== null ? (
        <section aria-label="Machine" style={{ display: "grid", gap: 10 }}>
          <span className="mono-label" style={{ color: "var(--cosmetic-accent)" }}>
            {"// "}Machine · Linux dans ton navigateur · ton propre flag
          </span>
          {machineFiles !== null && machine.ok ? (
            <LinuxTerminal
              id={`tournament-${tournament.id}-${challenge.id}`}
              title={machine.machine.title ?? challenge.title}
              files={machineFiles}
            />
          ) : (
            <p role="note" style={{ margin: 0, color: "var(--color-text-secondary)" }}>
              La machine de ce défi est indisponible pour le moment.
            </p>
          )}
        </section>
      ) : null}

      {challenge.resourceUrl !== null ? (
        <section
          aria-label="Connexion"
          className="card"
          style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 16px" }}
        >
          <span style={{ fontFamily: "var(--font-mono)", flex: 1, wordBreak: "break-all" }}>
            {challenge.resourceUrl}
          </span>
          <CopyButton text={challenge.resourceUrl} />
        </section>
      ) : null}

      {challenge.attachmentUrl !== null ? (
        <a
          className="btn btn--ghost"
          href={challenge.attachmentUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          style={{ justifySelf: "start" }}
        >
          ↓ Télécharger le fichier
        </a>
      ) : null}

      {challenge.type === "SCRIPT" ? (
        <TournamentScript
          tournamentId={tournament.id}
          challengeId={challenge.id}
          starterCode={challenge.starterCode ?? ""}
          solved={solved}
          notice={notice}
        />
      ) : solved ? (
        <p
          className="card"
          style={{ margin: 0, padding: "12px 16px", color: "var(--cosmetic-accent)" }}
        >
          Flag trouvé : ce défi compte pour toi et pour {tournament.myTeam ?? "ton équipe"}.
        </p>
      ) : notice !== null ? (
        <p
          className="card"
          style={{ margin: 0, padding: "12px 16px", color: "var(--color-text-muted)" }}
        >
          {notice}
        </p>
      ) : (
        <TournamentFlagForm
          tournamentId={tournament.id}
          challengeId={challenge.id}
          points={challenge.points}
        />
      )}
    </div>
  );
}
