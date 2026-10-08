import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import React from "react";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import {
  CHALLENGE_STATUS_LABELS,
  challengeStatus,
  challengeTypeLabel,
  flagNotice,
  tournamentDateLabel,
} from "@cyberlearn/lib/challenges/tournament";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";
import { CornerBrackets } from "@/app/_components/corner-brackets";
import { LinuxTerminal } from "@/app/(app)/lessons/[slug]/_components/linux-terminal";
import { CopyButton } from "@/components/copy-button";
import { Crumb } from "@/components/crumb";
import type { TournamentChallengeView } from "@/lib/tournaments/tournaments";
import {
  IconCheck,
  IconDownload,
  IconLock,
  PhaseBadge,
  Pips,
  SectionHead,
} from "../../../_components/parts";
import { TournamentFlagForm } from "./tournament-flag-form";
import { TournamentScript } from "./tournament-script";

/** The challenge's Linux machine, ready to boot with the player's own flag in its files. */
export interface TournamentMachine {
  title: string;
  files: Record<string, string>;
}

/**
 * One challenge of a tournament: its statement, its machine or its Python
 * runner as in the catalogue, and a flag that counts for the tournament;
 * readable, without a flag, once it is over.
 *
 * Laid out as a challenge of the catalogue is (challenges/[slug]/page.tsx):
 * the title beside a briefing with its points and the way to the flag, then
 * the statement under dashed heads, the tournament's rules in a rail.
 *
 * Server-side: the page hands it the challenge as the service reads it and
 * the machine already built with the player's flag, or null when the
 * challenge has a machine that could not be built (`challenge.onMachine`
 * says whether it has one).
 */
export function TournamentChallenge({
  tournament,
  challenge,
  solved,
  machine,
}: TournamentChallengeView & { machine: TournamentMachine | null }): React.ReactElement {
  const notice = flagNotice(tournament);
  // Where the reader stands with this challenge, in a word the briefing shows.
  const status = challengeStatus(tournament, solved);
  // A flag can be given below: the briefing points the way there.
  const playable = !solved && notice === null;
  const board = `/tournaments/${tournament.id}`;
  const category = categoryMeta(challenge.category).short;
  const diff = difficultyMeta(challenge.difficulty);
  const script = challenge.type === "SCRIPT";

  return (
    <div className="page-container trn" data-phase={tournament.phase}>
      <Crumb
        segments={[
          { label: "tournois", href: "/tournaments" },
          { label: tournament.title, href: board },
          challenge.slug,
        ]}
      />

      <header className="trn-hero">
        <div className="trn-hero__main">
          <div className="trn-hero__top">
            <p className="pg-eyebrow">
              Défi de tournoi · <b>{category}</b>
            </p>
          </div>
          <h1 className="pg-title trn-hero__title">{challenge.title}</h1>
          <div className="trn-tags">
            <span className="trn-tag" data-cat={challenge.category}>
              {category}
            </span>
            <span className="trn-tag">
              <Pips level={diff.level} />
              {diff.label}
            </span>
            <span className="trn-tag">{challengeTypeLabel(challenge.type)}</span>
          </div>
          <p className="pg-lede trn-hero__desc">{challenge.description}</p>
        </div>

        <div className="trn-brief">
          <CornerBrackets color="var(--trn-accent)" />
          <div className="trn-brief__head">
            <span>Défi · briefing</span>
            <PhaseBadge phase={tournament.phase} />
          </div>
          <dl className="trn-brief__stats">
            <div className="trn-stat trn-stat--big">
              <dt>Points</dt>
              <dd>
                <b>{challenge.points}</b> pts
              </dd>
            </div>
            <div className="trn-stat">
              <dt>Statut</dt>
              <dd className="trn-status" data-status={status}>
                {status === "solved" ? (
                  <IconCheck />
                ) : (
                  <span className="trn-dot" aria-hidden="true" />
                )}
                {CHALLENGE_STATUS_LABELS[status]}
              </dd>
            </div>
            <div className="trn-stat">
              <dt>{tournament.myTeam !== null ? "Ton équipe" : "Tournoi"}</dt>
              <dd>{tournament.myTeam ?? tournament.title}</dd>
            </div>
            <div className="trn-stat">
              <dt>{tournament.phase === "FINISHED" ? "Terminé le" : "Fin"}</dt>
              <dd>{tournamentDateLabel(new Date(tournament.endsAt))}</dd>
            </div>
          </dl>
          <div className="trn-brief__cta">
            {playable ? (
              <a className="btn btn--danger btn--lg btn--block" href="#trn-flag">
                Relever le défi <span aria-hidden="true">→</span>
              </a>
            ) : null}
            <Link
              href={board}
              className={playable ? "trn-brief__back" : "btn btn--ghost btn--lg btn--block"}
            >
              <span aria-hidden="true">←</span> Le tableau des scores
            </Link>
          </div>
        </div>
      </header>

      <div className="trn-body">
        <div className="trn-body__main">
          <section aria-label="Instructions" className="trn-block">
            <SectionHead title="Instructions" meta={`${String(challenge.points)} pts`} />
            <div className="challenge-instructions">
              <MDXRemote
                source={challenge.instructions}
                options={{
                  mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeHighlight] },
                }}
              />
            </div>
          </section>

          {challenge.onMachine ? (
            <section aria-label="Machine" className="trn-block">
              <SectionHead title="Machine" meta="Linux · dans ton navigateur · ton propre flag" />
              {machine !== null ? (
                <LinuxTerminal
                  id={`tournament-${tournament.id}-${challenge.id}`}
                  title={machine.title}
                  files={machine.files}
                />
              ) : (
                <p role="note" className="trn-notice">
                  La machine de ce défi est indisponible pour le moment.
                </p>
              )}
            </section>
          ) : null}

          {challenge.resourceUrl !== null ? (
            <section aria-label="Connexion" className="trn-block">
              <SectionHead title="Connexion" />
              <div className="trn-conn">
                <span className="trn-conn__p" aria-hidden="true">
                  $
                </span>
                <code>{challenge.resourceUrl}</code>
                <CopyButton text={challenge.resourceUrl} />
              </div>
            </section>
          ) : null}

          {challenge.attachmentUrl !== null ? (
            <section aria-label="Pièce jointe" className="trn-block">
              <SectionHead title="Pièce jointe" />
              <a
                className="btn btn--ghost"
                href={challenge.attachmentUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconDownload />
                Télécharger le fichier
              </a>
            </section>
          ) : null}

          <section id="trn-flag" aria-label="Le flag" className="trn-block trn-block--flag">
            {script ? (
              <SectionHead title="Environnement Python" meta="Pyodide · WebAssembly · isolé" />
            ) : (
              // Once no flag can be given, the head no longer invites one.
              <SectionHead title={notice !== null && !solved ? "Le flag" : "Soumettre le flag"} />
            )}
            {script ? (
              <TournamentScript
                tournamentId={tournament.id}
                challengeId={challenge.id}
                starterCode={challenge.starterCode ?? ""}
                solved={solved}
                notice={notice}
              />
            ) : solved ? (
              <div className="trn-done">
                <IconCheck />
                <div>
                  <p className="trn-done__title">Flag trouvé</p>
                  <p>Ce défi compte pour toi et pour {tournament.myTeam ?? "ton équipe"}.</p>
                </div>
              </div>
            ) : notice !== null ? (
              <p className="trn-notice">
                <IconLock />
                {notice}
              </p>
            ) : (
              <TournamentFlagForm
                tournamentId={tournament.id}
                challengeId={challenge.id}
                points={challenge.points}
              />
            )}
          </section>
        </div>

        <aside className="trn-rail" aria-label="Règles du tournoi">
          <section className="trn-section">
            <SectionHead title="Règles du tournoi" />
            <ol className="trn-rules">
              <li>
                <span className="trn-rules__n">01</span>
                <span>
                  Les points du défi vont à ton équipe la première fois qu&apos;un de ses membres
                  trouve le flag.
                </span>
              </li>
              <li>
                <span className="trn-rules__n">02</span>
                <span>Ton score à toi compte les flags que tu trouves toi-même.</span>
              </li>
              <li>
                <span className="trn-rules__n">03</span>
                <span>
                  Un mauvais flag ne coûte rien. Trop d&apos;essais d&apos;affilée, et il faut
                  attendre une minute.
                </span>
              </li>
              {challenge.onMachine ? (
                <li>
                  <span className="trn-rules__n">04</span>
                  <span>
                    Sur la machine, le flag est à toi seul : celui d&apos;un camarade ne marchera
                    pas chez toi.
                  </span>
                </li>
              ) : null}
            </ol>
          </section>
          <Link href={board} className="trn-railback">
            <span>
              <span className="trn-railback__k">Tableau des scores</span>
              <span className="trn-railback__v">
                {tournament.myTeam !== null
                  ? `Où en est ${tournament.myTeam}`
                  : "Où en est chaque équipe"}
              </span>
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </div>
    </div>
  );
}
