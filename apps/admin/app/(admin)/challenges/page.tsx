import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@cyberlearn/db";
import { ActiveToggle } from "./_components/active-toggle";

export const metadata: Metadata = { title: "Challenges" };

const DIFF_LABEL: Record<string, string> = {
  BEGINNER: "FACILE",
  INTERMEDIATE: "INTER",
  ADVANCED: "AVANCÉ",
  EXPERT: "EXPERT",
};

const DIFF_COLOR: Record<string, string> = {
  BEGINNER: "#0AFFD4",
  INTERMEDIATE: "#4D8BFF",
  ADVANCED: "#B14DFF",
  EXPERT: "#FFB020",
};

const TYPE_COLOR: Record<string, string> = {
  CTF: "#FF4D6D",
  PUZZLE: "#4D8BFF",
  LAB: "#0AFFD4",
};

const CAT_COLOR: Record<string, string> = {
  CYBERSEC: "#FF4D6D",
  DEV: "#4D8BFF",
  NETWORK: "#0AFFD4",
};

export default async function AdminChallengesPage(): Promise<React.ReactElement> {
  const challenges = await prisma.challenge.findMany({
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      refCode: true,
      slug: true,
      title: true,
      category: true,
      difficulty: true,
      type: true,
      xpReward: true,
      maxAttempts: true,
      isActive: true,
      _count: { select: { progress: { where: { status: "COMPLETED" } } } },
    },
  });

  const cell: React.CSSProperties = {
    padding: "11px 16px",
    fontSize: 12,
    color: "#B8B5D1",
    borderBottom: "1px solid rgba(31,27,71,0.6)",
    verticalAlign: "middle",
    fontFamily: "var(--font-mono)",
  };

  const headerCell: React.CSSProperties = {
    ...cell,
    color: "#6B6890",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    borderBottom: "1px solid #1F1B47",
    padding: "8px 16px",
  };

  function Pill({ label, color }: { label: string; color: string }): React.ReactElement {
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          fontFamily: "var(--font-mono)",
          border: `1px solid ${color}40`,
          background: `${color}12`,
          color,
        }}
      >
        {label}
      </span>
    );
  }

  return (
    <div style={{ padding: "32px 40px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 32,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "#FF4D6D",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            {"// ADMIN › CHALLENGES"}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 24,
              fontWeight: 700,
              color: "#F5F5FA",
              margin: 0,
            }}
          >
            Challenges
          </h1>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "#6B6890",
              margin: "6px 0 0",
            }}
          >
            {challenges.length} challenge{challenges.length !== 1 ? "s" : ""} au total
          </p>
        </div>
        <Link
          href="/challenges/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 18px",
            background: "#FF4D6D",
            color: "#fff",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.12em",
            textDecoration: "none",
            textTransform: "uppercase",
          }}
        >
          + Nouveau challenge
        </Link>
      </div>

      {/* Table */}
      <div
        style={{
          background: "#0A0826",
          border: "1px solid #1F1B47",
          overflow: "hidden",
        }}
      >
        {challenges.length === 0 ? (
          <div style={{ padding: "80px 40px", textAlign: "center" }}>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                fontSize: 16,
                color: "#F5F5FA",
                margin: "0 0 8px",
              }}
            >
              Aucun challenge
            </p>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "#6B6890",
                margin: "0 0 24px",
              }}
            >
              Crée le premier challenge pour commencer.
            </p>
            <Link
              href="/challenges/new"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 18px",
                background: "#FF4D6D",
                color: "#fff",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: "0.12em",
                textDecoration: "none",
                textTransform: "uppercase",
              }}
            >
              + Créer le premier challenge
            </Link>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={headerCell}>Ref / Titre</th>
                <th style={{ ...headerCell, width: 90 }}>Catégorie</th>
                <th style={{ ...headerCell, width: 100 }}>Difficulté</th>
                <th style={{ ...headerCell, width: 80 }}>Type</th>
                <th style={{ ...headerCell, width: 80 }}>XP</th>
                <th style={{ ...headerCell, width: 80 }}>Résolus</th>
                <th style={{ ...headerCell, width: 80 }}>Statut</th>
                <th style={{ ...headerCell, width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {challenges.map((c) => (
                <tr key={c.id} style={{ transition: "background 150ms ease" }}>
                  <td style={cell}>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "#6B6890",
                        marginBottom: 3,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {c.refCode}
                    </div>
                    <div style={{ color: "#F5F5FA", fontSize: 13, fontFamily: "var(--font-sans)" }}>
                      {c.title}
                    </div>
                  </td>
                  <td style={cell}>
                    <Pill label={c.category} color={CAT_COLOR[c.category] ?? "#6B6890"} />
                  </td>
                  <td style={cell}>
                    <Pill
                      label={DIFF_LABEL[c.difficulty] ?? c.difficulty}
                      color={DIFF_COLOR[c.difficulty] ?? "#6B6890"}
                    />
                  </td>
                  <td style={cell}>
                    <Pill label={c.type} color={TYPE_COLOR[c.type] ?? "#6B6890"} />
                  </td>
                  <td style={{ ...cell, color: "#0AFFD4", fontWeight: 700 }}>{c.xpReward}</td>
                  <td style={cell}>{c._count.progress}</td>
                  <td style={cell}>
                    <ActiveToggle challengeId={c.id} isActive={c.isActive} />
                  </td>
                  <td style={cell}>
                    <Link
                      href={`/challenges/${c.id}/edit`}
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        color: "#4D8BFF",
                        textDecoration: "none",
                        padding: "4px 10px",
                        border: "1px solid rgba(77,139,255,0.3)",
                        background: "rgba(77,139,255,0.06)",
                        textTransform: "uppercase",
                      }}
                    >
                      Éditer
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
