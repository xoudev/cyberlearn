import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { requireRequestUser } from "@/lib/auth";
import { challengeRepository, userRepository } from "@cyberlearn/db";
import { ChallengeAction } from "./_components/challenge-action";
import { HintsPanel } from "./_components/hints-panel";
import { CopyButton } from "./_components/copy-button";
import { ScriptRunner } from "./_components/script-runner";
import type { DisplayStatus } from "../_components/challenges-client";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const challenge = await challengeRepository.findBySlug(slug);
  return { title: challenge?.title ?? "Challenge introuvable" };
}

// ── Color maps ────────────────────────────────────────────────────────────────

const DIFF_COLOR: Record<string, string> = {
  BEGINNER: "var(--cosmetic-accent)",
  INTERMEDIATE: "#4D8BFF",
  ADVANCED: "#B14DFF",
  EXPERT: "#FFB020",
};

const DIFF_LABEL: Record<string, string> = {
  BEGINNER: "Facile",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancé",
  EXPERT: "Expert",
};

const CAT_COLOR: Record<string, string> = {
  CYBERSEC: "#FF4757",
  DEV: "#4D8BFF",
  NETWORK: "#0AFFD4",
};

const CAT_LABEL: Record<string, string> = {
  CYBERSEC: "Cybersec",
  DEV: "Dev",
  NETWORK: "Réseau",
};

const TYPE_COLOR: Record<string, string> = {
  CTF: "#FF4D6D",
  PUZZLE: "#4D8BFF",
  LAB: "var(--cosmetic-accent)",
  SCRIPT: "#6B6890",
};

// ── Sub-components ────────────────────────────────────────────────────────────

/** Angular tag with clip-path - matches design reference */
function AngularTag({
  label,
  color,
  bg,
  border,
}: {
  label: string;
  color: string;
  bg: string;
  border: string;
}): React.ReactElement {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 14px 6px 10px",
        fontFamily: "var(--font-mono)",
        fontWeight: 600,
        fontSize: 10,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        border: `1px solid ${border}`,
        background: bg,
        color,
        // SAFETY: clip-path is a valid CSS property, inline-style fallback OK
        clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 100%, 0 100%)",
        position: "relative",
      }}
    >
      {/* Dot before text */}
      <span
        style={{
          width: 5,
          height: 5,
          background: "currentColor",
          borderRadius: "50%",
          boxShadow: "0 0 6px currentColor",
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}

/** Stats card bracket corner span */
function BracketCorner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }): React.ReactElement {
  const top = pos === "tl" || pos === "tr" ? -1 : undefined;
  const bottom = pos === "bl" || pos === "br" ? -1 : undefined;
  const left = pos === "tl" || pos === "bl" ? -1 : undefined;
  const right = pos === "tr" || pos === "br" ? -1 : undefined;
  return (
    <span
      style={{
        position: "absolute",
        width: 14,
        height: 14,
        borderColor: "#FF4D6D",
        pointerEvents: "none",
        zIndex: 2,
        top,
        bottom,
        left,
        right,
        borderTop: pos === "tl" || pos === "tr" ? "1.5px solid" : undefined,
        borderBottom: pos === "bl" || pos === "br" ? "1.5px solid" : undefined,
        borderLeft: pos === "tl" || pos === "bl" ? "1.5px solid" : undefined,
        borderRight: pos === "tr" || pos === "br" ? "1.5px solid" : undefined,
      }}
    />
  );
}

/** Section header in terminal style */
function SectionHead({ label, meta }: { label: string; meta?: string }): React.ReactElement {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--cosmetic-accent)",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 12,
        paddingBottom: 14,
        borderBottom: "1px dashed #1F1B47",
        marginBottom: 28,
      }}
    >
      <span>
        {"// "}
        {label}
      </span>
      {meta !== undefined && (
        <span
          style={{
            marginLeft: "auto",
            color: "#3F3D5C",
            fontWeight: 500,
            fontSize: 10,
            letterSpacing: "0.12em",
          }}
        >
          {meta}
        </span>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ChallengeDetailPage({ params }: Props): Promise<React.ReactElement> {
  const { slug } = await params;
  const user = await requireRequestUser();

  const challenge = await challengeRepository.findBySlug(slug);
  if (!challenge) notFound();

  const [userProgress, revealedHintsData, userData, adjacent, firstBlood] = await Promise.all([
    challengeRepository.getUserProgress(user.id, challenge.id),
    challenge.hints.length > 0
      ? challengeRepository.getRevealedHintsWithContent(user.id, challenge.id)
      : Promise.resolve([]),
    userRepository.findForGamification(user.id),
    challengeRepository.findAdjacentChallenges(challenge.id, challenge.orderIndex),
    challengeRepository.getFirstBlood(challenge.id),
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

  const initialRevealed: Record<string, string> = {};
  for (const { hintId, content } of revealedHintsData) {
    initialRevealed[hintId] = content;
  }

  const catLabel = CAT_LABEL[challenge.category] ?? challenge.category;
  const catColor = CAT_COLOR[challenge.category] ?? "#6B6890";
  const diffColor = DIFF_COLOR[challenge.difficulty] ?? "#6B6890";
  const typeColor = TYPE_COLOR[challenge.type] ?? "#6B6890";
  const userAttempts = userProgress?.attempts ?? 0;
  const remaining = Math.max(0, challenge.maxAttempts - userAttempts);
  const solveCount: number = challenge._count.progress;

  // Split title on " - " for colored em part
  const titleParts = challenge.title.split(" - ");
  const titleMain = titleParts[0] ?? challenge.title;
  const titleEm = titleParts.length > 1 ? titleParts.slice(1).join(" - ") : null;

  const statusLabel =
    displayStatus === "COMPLETED"
      ? "Résolu"
      : displayStatus === "IN_PROGRESS"
        ? "En cours"
        : displayStatus === "LOCKED"
          ? "Verrouillé"
          : "Disponible";

  const statusColor =
    displayStatus === "COMPLETED"
      ? "var(--cosmetic-accent)"
      : displayStatus === "IN_PROGRESS"
        ? "#4D8BFF"
        : displayStatus === "LOCKED"
          ? "#6B6890"
          : "var(--cosmetic-accent)";

  return (
    <div className="chx">
      {/* ── Breadcrumb ───────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "#6B6890",
          letterSpacing: "0.04em",
          padding: "7px 16px",
          border: "1px solid #1F1B47",
          background: "rgba(5,4,26,0.6)",
          marginBottom: 36,
        }}
      >
        <span style={{ color: "var(--cosmetic-accent)", fontWeight: 700, marginRight: 10 }}>$</span>
        <span style={{ color: "#B8B5D1" }}>~</span>
        <span style={{ color: "#3F3D5C", margin: "0 4px" }}>/</span>
        <span style={{ color: "#B8B5D1" }}>cyberlearn</span>
        <span style={{ color: "#3F3D5C", margin: "0 4px" }}>/</span>
        <Link href="/challenges" style={{ color: "#B8B5D1", textDecoration: "none" }}>
          défis
        </Link>
        <span style={{ color: "#3F3D5C", margin: "0 4px" }}>/</span>
        <span style={{ color: "#FF4D6D" }}>{challenge.slug}</span>
      </div>

      {/* ── Hero (2-col grid) ─────────────────────────────────────────────────── */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.6fr) minmax(380px, 1fr)",
          gap: 56,
          marginBottom: 56,
          alignItems: "start",
        }}
      >
        {/* Left: title + tags + description */}
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#6B6890",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: 18,
            }}
          >
            <span style={{ color: "#FF4D6D" }}>{"// "}</span>
            {challenge.refCode}
          </div>

          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: "clamp(40px, 5.2vw, 68px)",
              lineHeight: 0.98,
              letterSpacing: "-0.035em",
              color: "#F5F5FA",
              margin: "0 0 26px",
            }}
          >
            {titleMain}
            {titleEm !== null && (
              <>
                {" · "}
                <em style={{ fontStyle: "normal", color: "#FF4D6D" }}>{titleEm}</em>
              </>
            )}
          </h1>

          {/* Angular tags */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
            <AngularTag
              label={catLabel}
              color={catColor}
              bg={`${catColor}1A`}
              border={`${catColor}66`}
            />
            <AngularTag
              label={DIFF_LABEL[challenge.difficulty] ?? challenge.difficulty}
              color={diffColor}
              bg={`${diffColor}14`}
              border={`${diffColor}66`}
            />
            <AngularTag
              label={challenge.type}
              color={typeColor}
              bg={`${typeColor}0F`}
              border={`${typeColor}4D`}
            />
          </div>

          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 16,
              color: "#B8B5D1",
              lineHeight: 1.6,
              maxWidth: 580,
              margin: 0,
            }}
          >
            {challenge.description}
          </p>
        </div>

        {/* Right: stats card with bracket corners */}
        <div
          style={{
            position: "relative",
            background: "rgba(5,4,26,0.85)",
            border: "1px solid #1F1B47",
            padding: 0,
          }}
        >
          <BracketCorner pos="tl" />
          <BracketCorner pos="tr" />
          <BracketCorner pos="bl" />
          <BracketCorner pos="br" />

          {/* Stats card header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 18px",
              borderBottom: "1px solid #1F1B47",
              background: "rgba(255,77,109,0.05)",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "#FF4D6D",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "currentColor",
                  boxShadow: "0 0 6px currentColor",
                  // SAFETY: inline animation keyword
                  animation: "pulse 2s ease-in-out infinite",
                  flexShrink: 0,
                }}
              />
              défi · briefing
            </span>
            <span>id · {challenge.refCode}</span>
          </div>

          {/* Stats 2×2 grid */}
          <div
            style={{
              padding: "22px 22px 18px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px 24px",
            }}
          >
            {/* XP */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "#6B6890",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                <span style={{ color: "var(--cosmetic-accent)" }}>{"› "}</span>XP Récompense
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 800,
                  fontSize: 26,
                  color: "var(--cosmetic-accent)",
                  lineHeight: 1,
                  letterSpacing: "-0.01em",
                }}
              >
                +{String(challenge.xpReward)} XP
              </span>
            </div>

            {/* Time */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "#6B6890",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                <span style={{ color: "var(--cosmetic-accent)" }}>{"› "}</span>Limite de temps
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 700,
                  fontSize: 18,
                  color: "#F5F5FA",
                  lineHeight: 1,
                }}
              >
                {challenge.timeLimitMin > 0 ? `${String(challenge.timeLimitMin)} min` : "Illimitée"}
              </span>
            </div>

            {/* Attempts */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "#6B6890",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                <span style={{ color: "var(--cosmetic-accent)" }}>{"› "}</span>Tentatives
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 700,
                  fontSize: 18,
                  color: "#F5F5FA",
                  lineHeight: 1,
                }}
              >
                {String(remaining)}/{String(challenge.maxAttempts)}
              </span>
            </div>

            {/* Status */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "#6B6890",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                <span style={{ color: "var(--cosmetic-accent)" }}>{"› "}</span>Statut
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: statusColor,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  lineHeight: 1,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "currentColor",
                    boxShadow: "0 0 6px currentColor",
                    flexShrink: 0,
                  }}
                />
                {statusLabel}
              </span>
            </div>
          </div>

          {/* CTA button scrolls to action section */}
          <a
            href="#challenge-action"
            style={{
              display: "block",
              width: "100%",
              padding: "18px 24px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              background: "#FF4D6D",
              color: "#fff",
              border: "none",
              borderTop: "1px solid #FF4D6D",
              cursor: "pointer",
              transition: "background 200ms ease",
              boxShadow: "0 0 28px rgba(255,77,109,0.3), inset 0 0 0 1px rgba(255,255,255,0.15)",
              textDecoration: "none",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            Relever le défi →
          </a>
        </div>
      </section>

      {/* ── Content grid (1.85fr | 1fr) ──────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.85fr) minmax(320px, 1fr)",
          gap: 48,
          alignItems: "start",
        }}
      >
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

          {/* Python sandbox - SCRIPT type only */}
          {challenge.type === "SCRIPT" && (
            <div style={{ marginBottom: 32 }}>
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
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  background: "#060420",
                  border: "1px solid #2A2560",
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
                    color: "#F5F5FA",
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
                  color: "#4D8BFF",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
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

        {/* ── Right rail (sticky) ─────────────────────────────────────────────── */}
        <aside
          style={{
            position: "sticky",
            top: 24,
            display: "flex",
            flexDirection: "column",
            gap: 36,
          }}
        >
          {/* Hints panel */}
          {challenge.hints.length > 0 && (
            <HintsPanel
              hints={challenge.hints}
              initialRevealed={initialRevealed}
              userXp={userData?.xpTotal ?? 0}
            />
          )}

          {/* Stats panel */}
          <section>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--cosmetic-accent)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 12,
                paddingBottom: 14,
                borderBottom: "1px dashed #1F1B47",
                marginBottom: 16,
              }}
            >
              {"// "}Statistiques
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
                color: "#B8B5D1",
                lineHeight: 1.8,
                letterSpacing: "0.02em",
                padding: "14px 16px",
                border: "1px solid #1F1B47",
                background: "rgba(5,4,26,0.5)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span style={{ color: "#6B6890" }}>Résolutions</span>
                <strong style={{ color: "var(--cosmetic-accent)" }}>{String(solveCount)}</strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                  borderTop: "1px dashed rgba(31,27,71,0.6)",
                }}
              >
                <span style={{ color: "#6B6890" }}>Limite de temps</span>
                <strong style={{ color: "#F5F5FA" }}>
                  {challenge.timeLimitMin > 0
                    ? `${String(challenge.timeLimitMin)} min`
                    : "Illimitée"}
                </strong>
              </div>
              {firstBlood !== null && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "4px 0",
                    borderTop: "1px dashed rgba(31,27,71,0.6)",
                  }}
                >
                  <span style={{ color: "#6B6890" }}>First blood</span>
                  <strong style={{ color: "#F5F5FA" }}>{firstBlood.displayName}</strong>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      {/* ── Bottom nav ────────────────────────────────────────────────────────── */}
      <nav
        style={{
          marginTop: 64,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          border: "1px solid #1F1B47",
          background: "rgba(10,8,38,0.5)",
        }}
      >
        {adjacent.prev !== null ? (
          <Link
            href={`/challenges/${adjacent.prev.slug}`}
            style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 4,
              padding: "22px 24px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#B8B5D1",
              textDecoration: "none",
              transition: "color 200ms ease, background 200ms ease",
              minHeight: 70,
            }}
          >
            ← Défi précédent
            <span
              style={{ fontSize: 9, color: "#3F3D5C", fontWeight: 500, letterSpacing: "0.16em" }}
            >
              {adjacent.prev.title}
            </span>
          </Link>
        ) : (
          <div style={{ padding: "22px 24px", minHeight: 70 }} />
        )}

        {adjacent.next !== null ? (
          <Link
            href={`/challenges/${adjacent.next.slug}`}
            style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
              padding: "22px 24px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#B8B5D1",
              textDecoration: "none",
              borderLeft: "1px solid #1F1B47",
              transition: "color 200ms ease, background 200ms ease",
              minHeight: 70,
            }}
          >
            Défi suivant →
            <span
              style={{ fontSize: 9, color: "#3F3D5C", fontWeight: 500, letterSpacing: "0.16em" }}
            >
              {adjacent.next.title}
            </span>
          </Link>
        ) : (
          <div style={{ padding: "22px 24px", borderLeft: "1px solid #1F1B47", minHeight: 70 }} />
        )}
      </nav>
    </div>
  );
}
