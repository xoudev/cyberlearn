import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { requireRequestUser } from "@/lib/auth";
import { challengeRepository, userRepository } from "@cyberlearn/db";
import { machineFilesWithFlag, parseChallengeMachine } from "@cyberlearn/types";
import { personalFlag } from "@/lib/challenges/flag";
import { weeklyStateOf } from "@/lib/challenges/catalogue";
import { WeeklyCountdown } from "../_components/weekly-countdown";
import { env } from "@/lib/env";
import { LinuxTerminal } from "@/app/(app)/lessons/[slug]/_components/linux-terminal";
import { ChallengeAction } from "./_components/challenge-action";
import { HintsPanel } from "./_components/hints-panel";
import { CopyButton } from "@/components/copy-button";
import { StickyRail } from "@/components/sticky-rail";
import { ScriptRunner } from "./_components/script-runner";
import { WriteupsSection } from "./_components/writeups-section";
import { writeupBoardFor } from "@/lib/challenges/writeups";
import type { DisplayStatus } from "../_components/challenges-client";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const challenge = await challengeRepository.findBySlug(slug);
  return { title: challenge?.title ?? "Challenge introuvable" };
}

import { Crumb } from "@/components/crumb";
import "./challenge-detail.css";

function SectionHead({ label, meta }: { label: string; meta?: string }): React.ReactElement {
  return (
    <div className="challenge-section-head">
      <h2>{label}</h2>
      {meta !== undefined && <span>{meta}</span>}
    </div>
  );
}

export default async function ChallengeDetailPage({ params }: Props): Promise<React.ReactElement> {
  const { slug } = await params;
  const user = await requireRequestUser();

  const challenge = await challengeRepository.findBySlug(slug);
  if (!challenge) notFound();

  const now = new Date();
  const [userProgress, revealedHintsData, userData, adjacent, firstBlood, weekly, writeupBoard] =
    await Promise.all([
      challengeRepository.getUserProgress(user.id, challenge.id),
      challenge.hints.length > 0
        ? challengeRepository.getRevealedHintsWithContent(user.id, challenge.id)
        : Promise.resolve([]),
      userRepository.findForGamification(user.id),
      challengeRepository.findAdjacentChallenges(challenge.id, challenge.orderIndex),
      challengeRepository.getFirstBlood(challenge.id),
      weeklyStateOf(challenge.id, now),
      writeupBoardFor(user.id, challenge.id),
    ]);

  // Compute display status
  let displayStatus: DisplayStatus;
  if (userProgress?.status === "COMPLETED") {
    displayStatus = "COMPLETED";
  } else if (userProgress?.status === "IN_PROGRESS") {
    displayStatus = "IN_PROGRESS";
  } else if (challenge.prerequisiteId !== null) {
    const prereqProgress = await challengeRepository.getUserProgress(
      user.id,
      challenge.prerequisiteId,
    );
    displayStatus = prereqProgress?.status === "COMPLETED" ? "AVAILABLE" : "LOCKED";
  } else {
    displayStatus = "AVAILABLE";
  }

  // The machine, with the learner's own flag where the author wrote {{FLAG}}.
  // Not handed out while the challenge is locked; unavailable, and said so,
  // when it cannot be read or the key of the flags is missing.
  const machine = challenge.machine === null ? null : parseChallengeMachine(challenge.machine);
  const flagSecret = env.CHALLENGE_FLAG_SECRET;
  const machineFiles =
    machine?.ok === true && flagSecret !== undefined && displayStatus !== "LOCKED"
      ? machineFilesWithFlag(machine.machine, personalFlag(flagSecret, challenge.id, user.id))
      : null;

  const initialRevealed: Record<string, string> = {};
  for (const { hintId, content } of revealedHintsData) {
    initialRevealed[hintId] = content;
  }

  const catLabel = categoryMeta(challenge.category).short;
  const userAttempts = userProgress?.attempts ?? 0;
  const remaining = Math.max(0, challenge.maxAttempts - userAttempts);
  const solveCount: number = challenge._count.progress;
  const solved = displayStatus === "COMPLETED";
  // What the solve is worth now, or was: twice the reward while this is the
  // week's challenge (@cyberlearn/lib/challenges/weekly).
  const xpShown = solved
    ? (userProgress?.xpEarned ?? challenge.xpReward)
    : challenge.xpReward * (weekly?.multiplier ?? 1);

  const statusLabel =
    displayStatus === "COMPLETED"
      ? "Résolu"
      : displayStatus === "IN_PROGRESS"
        ? "En cours"
        : displayStatus === "LOCKED"
          ? "Verrouillé"
          : "Disponible";

  return (
    <div className="page-container learning-catalogue learning-workspace challenge-workspace">
      <Crumb segments={[{ label: "défis", href: "/challenges" }, slug]} />
      <header className="challenge-hero">
        <p className="workspace-kicker">Pratiquer / {challenge.refCode}</p>
        <div className="challenge-hero__meta">
          <span>{catLabel}</span>
          <span>{difficultyMeta(challenge.difficulty).label}</span>
          <span>{challenge.type}</span>
          <strong>{statusLabel}</strong>
        </div>
        <h1>
          {challenge.title}
          {!/[.?!…:]$/.test(challenge.title) && <span>.</span>}
        </h1>
        <p className="challenge-hero__description">{challenge.description}</p>
      </header>
      <section className="challenge-brief" aria-label="Ce défi en bref">
        <dl className="challenge-facts">
          <div>
            <dt>{solved ? "XP gagnés" : "Récompense"}</dt>
            <dd>
              +{xpShown}
              <span> XP</span>
            </dd>
            {!solved && weekly !== null && (
              <p>
                ×{weekly.multiplier} cette semaine, au lieu de {challenge.xpReward} XP
              </p>
            )}
          </div>
          <div>
            <dt>Limite de temps</dt>
            <dd>
              {challenge.timeLimitMin > 0 ? challenge.timeLimitMin : "Sans limite"}
              {challenge.timeLimitMin > 0 && <span> min</span>}
            </dd>
          </div>
          <div>
            <dt>Tentatives restantes</dt>
            <dd>
              {remaining}
              <span> / {challenge.maxAttempts}</span>
            </dd>
          </div>
          <div>
            <dt>Résolutions</dt>
            <dd>{solveCount}</dd>
            {firstBlood !== null && <p>First blood · {firstBlood.displayName}</p>}
          </div>
        </dl>
        <div className="challenge-brief__actions">
          {displayStatus === "LOCKED" && challenge.prerequisite !== null ? (
            <Link className="btn" href={`/challenges/${challenge.prerequisite.slug}`}>
              Termine d’abord « {challenge.prerequisite.title} »
            </Link>
          ) : solved ? (
            <a className="btn" href="#challenge-action">
              Défi résolu
            </a>
          ) : (
            <a
              className="btn"
              href={challenge.type === "SCRIPT" ? "#challenge-script" : "#challenge-action"}
            >
              {displayStatus === "IN_PROGRESS" ? "Reprendre le défi" : "Relever le défi"}{" "}
              <span aria-hidden="true">↗</span>
            </a>
          )}
          {weekly !== null && (
            <div className="challenge-brief__weekly">
              <strong>Défi de la semaine</strong>
              <WeeklyCountdown
                endsAt={weekly.endsAt}
                nowMs={now.getTime()}
                prefix={solved ? "Prochain défi dans" : `XP ×${String(weekly.multiplier)} encore`}
              />
            </div>
          )}
        </div>
      </section>
      {/* ── Content grid (1.85fr | 1fr, stacked on narrow screens) ──────────── */}
      <div className="chx-body" data-has-hints={challenge.hints.length > 0}>
        {/* ── Left column ────────────────────────────────────────────────────── */}
        <div>
          {/* Instructions */}
          <div style={{ marginBottom: 32 }}>
            <SectionHead label="Instructions" meta={`${String(challenge.xpReward)} XP`} />
            <div className="challenge-instructions">
              <MDXRemote
                source={challenge.instructions}
                options={{
                  mdxOptions: {
                    remarkPlugins: [remarkGfm],
                    rehypePlugins: [rehypeHighlight],
                  },
                }}
              />
            </div>
          </div>

          {/* Linux machine - a CTF played in the browser */}
          {machine !== null && displayStatus !== "LOCKED" && (
            <div style={{ marginBottom: 32 }}>
              <SectionHead label="Machine" meta="Linux · dans ton navigateur · ton propre flag" />
              {machineFiles !== null ? (
                <LinuxTerminal
                  id={`challenge-${challenge.id}`}
                  title={machine.ok ? (machine.machine.title ?? challenge.title) : challenge.title}
                  files={machineFiles}
                />
              ) : (
                <p role="note" style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
                  La machine de ce défi est indisponible pour le moment.
                </p>
              )}
            </div>
          )}

          {/* Python sandbox - SCRIPT type only */}
          {challenge.type === "SCRIPT" && (
            <div id="challenge-script" style={{ marginBottom: 32 }}>
              <SectionHead label="Environnement Python" meta="Pyodide · WebAssembly · isolé" />
              <ScriptRunner
                starterCode={challenge.starterCode ?? ""}
                challengeId={challenge.id}
                displayStatus={displayStatus}
                maxAttempts={challenge.maxAttempts}
                userAttempts={userAttempts}
              />
            </div>
          )}

          {/* Connection info */}
          {challenge.resourceUrl !== null && (
            <div style={{ marginBottom: 32 }}>
              <SectionHead label="Connexion" />
              <div
                className="card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderLeft: "3px solid var(--cosmetic-accent)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--cosmetic-accent)",
                    flexShrink: 0,
                  }}
                >
                  $
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--color-text-primary)",
                    flex: 1,
                    wordBreak: "break-all",
                    lineHeight: 1.5,
                  }}
                >
                  {challenge.resourceUrl}
                </span>
                <CopyButton text={challenge.resourceUrl} />
              </div>
            </div>
          )}

          {/* Attachment */}
          {challenge.attachmentUrl !== null && (
            <div style={{ marginBottom: 32 }}>
              <SectionHead label="Pièces jointes" />
              <a
                className="mono-label"
                href={challenge.attachmentUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 18px",
                  background: "transparent",
                  border: "1px solid rgba(77,139,255,0.3)",
                  color: "var(--color-info)",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                ↓ Télécharger le fichier
              </a>
            </div>
          )}

          {/* Action panel - CTF, PUZZLE, LAB, LOCKED */}
          {challenge.type !== "SCRIPT" && (
            <div style={{ marginBottom: 32 }}>
              <SectionHead label={challenge.type === "CTF" ? "Soumettre le flag" : "Validation"} />
              <ChallengeAction
                challengeId={challenge.id}
                type={challenge.type}
                displayStatus={displayStatus}
                maxAttempts={challenge.maxAttempts}
                userAttempts={userAttempts}
                prerequisiteTitle={challenge.prerequisite?.title ?? null}
              />
            </div>
          )}
        </div>

        {challenge.hints.length > 0 && (
          <StickyRail className="chx-rail">
            <HintsPanel
              hints={challenge.hints}
              initialRevealed={initialRevealed}
              userXp={userData?.xpTotal ?? 0}
            />
          </StickyRail>
        )}
      </div>

      {writeupBoard !== null ? (
        <WriteupsSection challengeId={challenge.id} board={writeupBoard} />
      ) : null}

      {/* ── Bottom nav ────────────────────────────────────────────────────────── */}
      <nav
        className="challenge-neighbours"
        aria-label="Autres défis"
        style={{
          marginTop: 64,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          border: "1px solid var(--color-border-subtle)",
          background: "rgba(10,8,38,0.5)",
        }}
      >
        {adjacent.prev !== null ? (
          <Link
            className="mono-label mono-label--md"
            href={`/challenges/${adjacent.prev.slug}`}
            style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 4,
              padding: "22px 24px",
              fontWeight: 700,
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              transition: "color 200ms ease, background 200ms ease",
              minHeight: 70,
            }}
          >
            ← Défi précédent
            <span
              style={{
                fontSize: 9,
                color: "var(--color-text-muted)",
                fontWeight: 500,
                letterSpacing: "0.16em",
              }}
            >
              {adjacent.prev.title}
            </span>
          </Link>
        ) : (
          <div style={{ padding: "22px 24px", minHeight: 70 }} />
        )}

        {adjacent.next !== null ? (
          <Link
            className="mono-label mono-label--md"
            href={`/challenges/${adjacent.next.slug}`}
            style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
              padding: "22px 24px",
              fontWeight: 700,
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              borderLeft: "1px solid var(--color-border-subtle)",
              transition: "color 200ms ease, background 200ms ease",
              minHeight: 70,
            }}
          >
            Défi suivant →
            <span
              style={{
                fontSize: 9,
                color: "var(--color-text-muted)",
                fontWeight: 500,
                letterSpacing: "0.16em",
              }}
            >
              {adjacent.next.title}
            </span>
          </Link>
        ) : (
          <div
            style={{
              padding: "22px 24px",
              borderLeft: "1px solid var(--color-border-subtle)",
              minHeight: 70,
            }}
          />
        )}
      </nav>
    </div>
  );
}
