import React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { userRepository } from "@cyberlearn/db";
import { computeLevel } from "@cyberlearn/lib";
import type { BadgeRarity, Category } from "@cyberlearn/db";

// ── Design tokens ─────────────────────────────────────────────────────────────

const RARITY_META: Record<
  BadgeRarity,
  { color: string; bg: string; border: string; glow: string }
> = {
  COMMON: {
    color: "#0AFFD4",
    bg: "rgba(10,255,212,0.06)",
    border: "rgba(10,255,212,0.25)",
    glow: "rgba(10,255,212,0.2)",
  },
  RARE: {
    color: "#4D8BFF",
    bg: "rgba(77,139,255,0.06)",
    border: "rgba(77,139,255,0.25)",
    glow: "rgba(77,139,255,0.2)",
  },
  EPIC: {
    color: "#B14DFF",
    bg: "rgba(177,77,255,0.06)",
    border: "rgba(177,77,255,0.25)",
    glow: "rgba(177,77,255,0.2)",
  },
  LEGENDARY: {
    color: "#FFB020",
    bg: "rgba(255,176,32,0.06)",
    border: "rgba(255,176,32,0.25)",
    glow: "rgba(255,176,32,0.2)",
  },
};

const CAT_COLOR: Partial<Record<Category, string>> = {
  CYBERSEC: "#FF4757",
  DEV: "#6E8BFF",
  NETWORK: "#0AFFD4",
};

// ── Metadata ──────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PublicProfilePage({ params }: Props): Promise<React.ReactElement> {
  const { username } = await params;

  const user = await userRepository.findPublicProfile(username);
  if (!user) notFound();

  const { level } = computeLevel(user.xpTotal);
  const joinedStr = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
    user.createdAt,
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#030219",
        display: "flex",
        justifyContent: "center",
        padding: "60px 24px 80px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 720 }}>
        {/* ── Back link ────────────────────────────────────────────────── */}
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11,
            color: "#6B6890",
            letterSpacing: "0.08em",
            textDecoration: "none",
            marginBottom: 36,
            textTransform: "uppercase",
          }}
        >
          ← cyberlearn
        </Link>

        {/* ── Hero header ──────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 24,
            padding: "28px",
            background: "#0A0826",
            border: "1px solid #1F1B47",
            borderRadius: 14,
            marginBottom: 20,
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "#1F1B47",
              border: "2px solid #2A2560",
              overflow: "hidden",
              flexShrink: 0,
              position: "relative",
            }}
          >
            {user.avatarUrl && !user.avatarUrl.startsWith("__glyph:") ? (
              <Image
                src={user.avatarUrl}
                alt={user.displayName}
                fill
                style={{ objectFit: "cover" }}
                sizes="80px"
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono, monospace)",
                  fontWeight: 700,
                  fontSize: 26,
                  color: "#0AFFD4",
                }}
              >
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Identity */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontFamily: "var(--font-sans, sans-serif)",
                fontWeight: 700,
                fontSize: 22,
                color: "#F5F5FA",
                letterSpacing: "-0.01em",
                margin: "0 0 4px",
              }}
            >
              {user.displayName}
            </h1>
            <p
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 11,
                color: "#6B6890",
                letterSpacing: "0.04em",
                margin: "0 0 10px",
              }}
            >
              @{user.username}
            </p>
            {user.bio && (
              <p
                style={{
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontSize: 13,
                  color: "#B8B5D1",
                  margin: "0 0 12px",
                  lineHeight: 1.5,
                }}
              >
                {user.bio}
              </p>
            )}
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 10,
                color: "#3F3D5C",
                letterSpacing: "0.08em",
              }}
            >
              Membre depuis {joinedStr}
            </span>
          </div>

          {/* Level badge */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "10px 18px",
              background: "rgba(10,255,212,0.06)",
              border: "1px solid rgba(10,255,212,0.2)",
              borderRadius: 10,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 9,
                color: "#0AFFD4",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Niveau
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 700,
                fontSize: 28,
                color: "#F5F5FA",
                lineHeight: 1,
              }}
            >
              {level}
            </span>
          </div>
        </div>

        {/* ── Stats ────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {[
            {
              label: "XP Total",
              value: `+${user.xpTotal.toLocaleString("fr-FR")}`,
              color: "#0AFFD4",
            },
            {
              label: "Streak actuel",
              value: `${user.streakDays} j`,
              color: user.streakDays > 0 ? "#FFB020" : "#6B6890",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                padding: "16px 20px",
                background: "#0A0826",
                border: "1px solid #1F1B47",
                borderRadius: 10,
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 10,
                  color: "#3F3D5C",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  margin: "0 0 8px",
                }}
              >
                {label}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontWeight: 700,
                  fontSize: 24,
                  color,
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Badges ───────────────────────────────────────────────────── */}
        {user.badges.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2
              style={{
                fontFamily: "var(--font-sans, sans-serif)",
                fontWeight: 600,
                fontSize: 15,
                color: "#F5F5FA",
                letterSpacing: "-0.01em",
                margin: "0 0 16px",
              }}
            >
              Badges
              <span
                style={{
                  marginLeft: 8,
                  fontFamily: "var(--font-mono, monospace)",
                  fontWeight: 400,
                  fontSize: 11,
                  color: "#6B6890",
                }}
              >
                {user.badges.length}
              </span>
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(56px, 56px))",
                gap: 10,
              }}
            >
              {user.badges.map((ub) => {
                const meta = RARITY_META[ub.badge.rarity];
                return (
                  <div
                    key={ub.id}
                    title={ub.badge.name}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      background: meta.bg,
                      border: `2px solid ${meta.border}`,
                      boxShadow: `0 0 10px ${meta.glow}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    <Image
                      src={ub.badge.iconUrl}
                      alt={ub.badge.name}
                      width={32}
                      height={32}
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Recent lessons ────────────────────────────────────────────── */}
        {user.lessonProgress.length > 0 && (
          <section>
            <h2
              style={{
                fontFamily: "var(--font-sans, sans-serif)",
                fontWeight: 600,
                fontSize: 15,
                color: "#F5F5FA",
                letterSpacing: "-0.01em",
                margin: "0 0 16px",
              }}
            >
              Leçons terminées récemment
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {user.lessonProgress.map((lp, i) => {
                const catColor = CAT_COLOR[lp.lesson.category as Category] ?? "#6B6890";
                const dateStr = lp.completedAt
                  ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
                      lp.completedAt,
                    )
                  : "—";

                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "12px 16px",
                      background: "#0A0826",
                      border: "1px solid #1F1B47",
                      borderRadius: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 3,
                        height: 28,
                        background: catColor,
                        borderRadius: 2,
                        flexShrink: 0,
                        boxShadow: `0 0 6px ${catColor}60`,
                      }}
                    />
                    <p
                      style={{
                        fontFamily: "var(--font-sans, sans-serif)",
                        fontWeight: 500,
                        fontSize: 13,
                        color: "#F5F5FA",
                        margin: 0,
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {lp.lesson.title}
                    </p>
                    <span
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: 10,
                        color: "#3F3D5C",
                        letterSpacing: "0.04em",
                        flexShrink: 0,
                      }}
                    >
                      {dateStr}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
