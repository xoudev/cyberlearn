"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { FriendsBoard, LeaderboardEntry, PodLadderEntry } from "@cyberlearn/db";
import type { LeagueDivisionCode } from "@cyberlearn/lib";
import { DISPLAY, fmtXp, getMonogram, HexAvatar, MONO } from "./shared";
import { LeagueClient } from "./LeagueClient";
import styles from "./leaderboard.module.css";
import { formatNumberFr } from "@cyberlearn/lib";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTier(level: number): string {
  if (level >= 28) return "Maître";
  if (level >= 20) return "Expert";
  if (level >= 10) return "Adepte";
  return "Novice";
}

// ── Style constants ────────────────────────────────────────────────────────────

const RK_COLORS: Record<number, { color: string; grad: string }> = {
  1: { color: "#FFB547", grad: "linear-gradient(135deg, #FFE08A 0%, #FFB547 50%, #FF8E1F 100%)" },
  2: { color: "#C8CFE2", grad: "linear-gradient(135deg, #F0F2F8 0%, #B8B5D1 50%, #7F7BA9 100%)" },
  3: { color: "#E08A4A", grad: "linear-gradient(135deg, #F2B07A 0%, #E08A4A 50%, #8C4A1F 100%)" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function FlameIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3C12 7.5 8 9 8 13.5C8 14.8 8.7 15.5 9.6 15.5C8.6 17 8 18.3 8 19.5C8 22 10 24 13 24C16.5 24 19 21.5 19 17.8C19 13.5 14.5 12 14.5 8C14.5 6 13.7 4.5 12 3Z" />
    </svg>
  );
}

// ── Podium card ───────────────────────────────────────────────────────────────

function PodiumCard({
  entry,
  rank,
  isMe,
}: { entry: LeaderboardEntry; rank: number; isMe: boolean }) {
  const rk = isMe
    ? {
        color: "var(--cosmetic-accent)",
        grad: "linear-gradient(135deg, #5FFFE6 0%, var(--cosmetic-accent) 50%, #0024FF 100%)",
      }
    : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (RK_COLORS[rank] ?? RK_COLORS[3]!);
  const mono = getMonogram(entry.displayName, entry.username);
  const tier = getTier(entry.level);
  const isGold = rank === 1 && !isMe;

  return (
    <div
      style={{
        position: "relative",
        background: isGold
          ? "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,181,71,0.10), transparent 60%), rgba(5,4,26,0.7)"
          : "rgba(5,4,26,0.6)",
        border: `1px solid #2A2560`,
        padding: "28px 22px 26px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        minHeight: isGold ? 440 : 380,
        transform: !isGold && !isMe ? "translateY(20px)" : undefined,
        boxShadow: isGold
          ? "0 0 0 1px rgba(255,181,71,0.18) inset, 0 0 28px rgba(255,181,71,0.18)"
          : isMe
            ? "0 0 0 1px color-mix(in srgb, var(--cosmetic-accent) 40%, transparent) inset, 0 0 28px color-mix(in srgb, var(--cosmetic-accent) 30%, transparent)"
            : undefined,
      }}
    >
      {/* bracket corners */}
      {(["tl", "tr", "bl", "br"] as const).map((pos) => (
        <span
          key={pos}
          style={{
            position: "absolute",
            width: 16,
            height: 16,
            [pos.startsWith("t") ? "top" : "bottom"]: -1,
            [pos.endsWith("l") ? "left" : "right"]: -1,
            borderColor: rk.color,
            borderStyle: "solid",
            borderWidth: 0,
            ...(pos === "tl"
              ? { borderTopWidth: 2, borderLeftWidth: 2 }
              : pos === "tr"
                ? { borderTopWidth: 2, borderRightWidth: 2 }
                : pos === "bl"
                  ? { borderBottomWidth: 2, borderLeftWidth: 2 }
                  : { borderBottomWidth: 2, borderRightWidth: 2 }),
            pointerEvents: "none",
          }}
        />
      ))}

      {/* ME badge */}
      {isMe && (
        <span
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            ...MONO,
            fontWeight: 700,
            fontSize: 9,
            letterSpacing: "0.22em",
            color: "var(--cosmetic-accent)",
            background: "color-mix(in srgb, var(--cosmetic-accent) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--cosmetic-accent) 50%, transparent)",
            padding: "4px 8px",
          }}
        >
          › TOI
        </span>
      )}

      {/* Rank plate */}
      <span
        style={{
          position: "absolute",
          top: -18,
          left: "50%",
          transform: "translateX(-50%)",
          ...MONO,
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          background: "#030219",
          border: `1px solid ${rk.color}`,
          color: rk.color,
          padding: "6px 14px",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 0 14px rgba(0,0,0,0.5)",
          whiteSpace: "nowrap",
        }}
      >
        {rank === 1 && !isMe && (
          <span style={{ color: "#FFB547", textShadow: "0 0 10px #FFB547" }}>★</span>
        )}
        RANG · <b style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.01em" }}>#{rank}</b>
      </span>

      {/* Hex avatar */}
      <div style={{ margin: "14px 0 18px" }}>
        <HexAvatar mono={mono} grad={rk.grad} size={isGold ? 100 : 80} />
      </div>

      {/* Handle */}
      <h2
        style={{
          ...DISPLAY,
          fontWeight: 700,
          fontSize: isGold ? 26 : 22,
          letterSpacing: "-0.01em",
          color: "#F5F5FA",
          margin: "0 0 4px",
          display: "inline-flex",
          alignItems: "baseline",
          gap: 2,
        }}
      >
        <span
          style={{
            color: "var(--cosmetic-accent)",
            ...MONO,
            fontWeight: 500,
            fontSize: isGold ? 20 : 16,
          }}
        >
          @
        </span>
        {entry.username ?? entry.displayName ?? "Anonyme"}
      </h2>
      <p
        style={{
          ...MONO,
          fontSize: 11,
          letterSpacing: "0.1em",
          color: "#7F7BA9",
          textTransform: "uppercase",
          margin: "0 0 16px",
        }}
      >
        {entry.displayName ?? ""}
      </p>

      {/* XP */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            ...DISPLAY,
            fontWeight: 800,
            fontSize: isGold ? 48 : 36,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            background: rk.grad,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {fmtXp(entry.xpTotal)}
        </span>
        <span
          style={{
            ...MONO,
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: "0.18em",
            color: "#7F7BA9",
            textTransform: "uppercase",
          }}
        >
          XP
        </span>
      </div>

      {/* Level badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 14px",
          ...MONO,
          fontWeight: 700,
          fontSize: 10.5,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#B8B5D1",
          border: "1px solid #2A2560",
          background: "rgba(5,4,26,0.6)",
        }}
      >
        LVL ·{" "}
        <b style={{ color: rk.color, fontWeight: 800, fontSize: 13, letterSpacing: "-0.01em" }}>
          {entry.level}
        </b>
        <span style={{ color: "#F5F5FA", fontWeight: 500, letterSpacing: "0.12em" }}>{tier}</span>
      </div>

      {/* Streak */}
      <div
        style={{
          marginTop: 12,
          ...MONO,
          fontSize: 10.5,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#FFB547",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ filter: "drop-shadow(0 0 8px rgba(255,181,71,0.55))" }}>
          <FlameIcon size={13} />
        </span>
        STREAK · <b style={{ fontWeight: 700 }}>{entry.streakDays}j</b>
      </div>
    </div>
  );
}

// ── You banner ────────────────────────────────────────────────────────────────

/**
 * The "Top X%" line, or null when a percentage would say less than the rank.
 *
 * It read wrong at both ends: first of 300 rounded down to "Top 0%", last of 50
 * announced "Top 100%", and on a board of three the leader was "Top 33%". Ceil
 * rather than round, floored at 1 - being first is top 1%, not top nothing -
 * and withheld entirely on a small board, where one point of percentage is
 * worth more than a whole rank and the rank already says it better.
 */
export function topPercentile(userRank: number, totalPlayers: number): number | null {
  const PERCENTILE_FLOOR = 20;
  if (totalPlayers < PERCENTILE_FLOOR || userRank < 1) return null;
  return Math.min(100, Math.max(1, Math.ceil((userRank / totalPlayers) * 100)));
}

function YouBanner({
  entry,
  userRank,
  totalPlayers,
}: {
  entry: LeaderboardEntry | null;
  userRank: number;
  totalPlayers: number;
}) {
  // Not ranked (findUserRank's 0): say why instead of leaving the reader to
  // look for themselves in a list they are not part of.
  if (userRank < 1) {
    return (
      <aside className={styles.position} aria-label="Ton classement">
        <div className={styles.identity}>
          <strong>Tu n&apos;apparais pas dans ce classement</strong>
          <span>
            Il compte les apprenants à partir de leur premier XP. Un compte de l&apos;équipe ou un
            profil masqué dans les paramètres n&apos;y figure pas.
          </span>
        </div>
      </aside>
    );
  }
  if (!entry) return null;
  return (
    <aside className={styles.position} aria-label="Ton classement">
      <span className={styles.positionRank}>#{userRank}</span>
      <div className={styles.identity}>
        <strong>Ta place dans le classement</strong>
        <span>
          {formatNumberFr(totalPlayers)} joueurs · Niveau {entry.level}
        </span>
      </div>
      <strong className={styles.score}>
        {fmtXp(entry.xpTotal)} <small>XP</small>
      </strong>
    </aside>
  );
}

function PlayerCard({ entry }: { entry: LeaderboardEntry }) {
  const handle = entry.username ?? entry.displayName ?? "Anonyme";
  return (
    <li className={[styles.player, entry.isCurrentUser ? styles.currentPlayer : ""].join(" ")}>
      <div className={styles.playerTop}>
        <span className={styles.rank} style={{ color: RK_COLORS[entry.rank]?.color }}>
          #{entry.rank}
        </span>
        {entry.isCurrentUser ? <span className={styles.you}>Toi</span> : null}
      </div>
      <div className={styles.playerIdentity}>
        <HexAvatar
          mono={getMonogram(entry.displayName, entry.username)}
          grad={
            RK_COLORS[entry.rank]?.grad ??
            "linear-gradient(135deg, #6e8bff, var(--cosmetic-accent))"
          }
          size={44}
        />
        <div className={styles.identity}>
          <strong title={handle}>@{handle}</strong>
          <span>
            Niveau {entry.level} · {getTier(entry.level)}
          </span>
        </div>
      </div>
      <div className={styles.playerBottom}>
        <strong className={styles.score}>
          {fmtXp(entry.xpTotal)} <small>XP</small>
        </strong>
        <span className={styles.streak}>
          <FlameIcon /> {entry.streakDays} j
        </span>
      </div>
    </li>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

/**
 * The friends board.
 *
 * Nobody is anonymised here and nobody is greyed out: on a list this short,
 * "Anonyme" would be a name with one step missing - a reader knows who their own
 * friends are. Somebody is listed under their name because they said so, or
 * they are absent. The notice below says which of the two the reader is, since
 * being on this board says nothing about being on their friends'.
 */
function FriendsSection({ board }: { board: FriendsBoard }): React.JSX.Element {
  const others = board.entries.filter((e) => !e.isCurrentUser);

  return (
    <section aria-label="Classement entre amis">
      <div className={styles.sectionHeading}>
        <h2>Tes amis</h2>
        <span>
          {others.length === 0
            ? "personne pour l'instant"
            : `${String(others.length)} ami${others.length > 1 ? "s" : ""}`}
        </span>
      </div>

      {board.entries.length === 0 ? (
        <p style={{ ...DISPLAY, fontSize: 14, color: "#8B88A8", margin: "0 0 20px" }}>
          Rien à classer pour l&apos;instant : ce tableau réunit les amis qui ont choisi d&apos;y
          figurer.
        </p>
      ) : (
        <ol className={styles.players}>
          {board.entries.map((entry) => (
            <PlayerCard key={entry.rank} entry={entry} />
          ))}
        </ol>
      )}

      <p
        style={{
          ...MONO,
          fontSize: 11.5,
          lineHeight: 1.6,
          color: "#7F7BA9",
          border: "1px solid #2A2560",
          background: "rgba(5,4,26,0.5)",
          padding: "14px 16px",
          margin: "24px 0 0",
        }}
      >
        {board.listedForFriends ? (
          <>
            Tes amis te voient dans leur propre classement.{" "}
            <Link href="/settings/privacy" style={{ color: "var(--cosmetic-accent)" }}>
              Changer
            </Link>
          </>
        ) : (
          <>
            Tu n&apos;apparais pas dans le classement de tes amis : ce tableau est le tien, eux ne
            t&apos;y voient pas.{" "}
            <Link href="/settings/privacy" style={{ color: "var(--cosmetic-accent)" }}>
              S&apos;y ajouter
            </Link>
          </>
        )}
      </p>
    </section>
  );
}

interface Props {
  entries: LeaderboardEntry[];
  userRank: number;
  currentEntry: LeaderboardEntry | null;
  season: { index: number; startsAt: number; endsAt: number } | null;
  membership: { division: LeagueDivisionCode; pod: number; seasonXp: number } | null;
  podLadder: PodLadderEntry[];
  podMemberCount: number;
  friendsBoard: FriendsBoard;
}

export function LeaderboardClient({
  entries,
  userRank,
  currentEntry,
  season,
  membership,
  podLadder,
  podMemberCount,
  friendsBoard,
}: Props): React.JSX.Element {
  const [filter, setFilter] = useState<"global" | "friends" | "month" | "week" | "league">(
    "global",
  );

  // Podium order: silver (rank 2), gold (rank 1), bronze (rank 3)
  const podiumOrder = [
    entries.find((e) => e.rank === 2),
    entries.find((e) => e.rank === 1),
    entries.find((e) => e.rank === 3),
  ].filter(Boolean) as LeaderboardEntry[];

  const top12 = entries.filter((e) => e.rank <= 12);
  // Rows around the current user (2 above, me, 2 below)
  const nearMeIdx = entries.findIndex((e) => e.isCurrentUser);
  const contextRows =
    nearMeIdx >= 0
      ? entries.slice(Math.max(12, nearMeIdx - 2), Math.min(entries.length, nearMeIdx + 3))
      : [];

  const FILTERS = [
    { id: "global" as const, label: "Global" },
    { id: "friends" as const, label: "Amis" },
    { id: "league" as const, label: "Ligue" },
    { id: "month" as const, label: "Ce mois" },
    { id: "week" as const, label: "Cette semaine" },
  ];

  return (
    <>
      <style>{`
        @keyframes cl-blink { 0%,50%{opacity:1} 50.01%,100%{opacity:0} }
        @keyframes cl-pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        @media (prefers-reduced-motion:reduce){.cl-caret{animation:none!important}.cl-live-dot{animation:none!important}}
        .cl-row:not(.cl-row-head):hover{background:color-mix(in srgb, var(--cosmetic-accent) 3%, transparent)!important}

        /* Podium: 3-across only on wide screens. Content width drops to
           viewport-240 once the sidebar reappears at 1024px, so the podium
           (needs ~1000px for 3 columns) stays 3-across only from 1280px up.
           Below that it becomes a single centered column. */
        @media (max-width: 1279px) {
          .cl-podium {
            grid-template-columns: min(100%, 440px) !important;
            justify-content: center;
            align-items: stretch !important;
            gap: 20px !important;
            margin-bottom: 56px !important;
          }
          /* Drop the desktop "staircase" offset when stacked vertically. */
          .cl-podium > * { transform: none !important; }
          /* DOM order is silver, gold, bronze; reorder so the winner leads:
             gold #1, then #2, then #3. */
          .cl-podium > :nth-child(1) { order: 2; }
          .cl-podium > :nth-child(2) { order: 1; }
          .cl-podium > :nth-child(3) { order: 3; }
        }

      `}</style>

      <div className="page-container">
        {/* Breadcrumb */}
        <div
          style={{
            ...MONO,
            fontSize: 12,
            letterSpacing: "0.04em",
            color: "#7F7BA9",
            marginBottom: 28,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "var(--cosmetic-accent)" }}>$</span>
          <span>~/</span>
          <b style={{ color: "#B8B5D1", fontWeight: 500 }}>cyberlearn</b>
          <span style={{ color: "#44406B" }}>/</span>
          <span style={{ color: "#F5F5FA", fontWeight: 500 }}>classement</span>
          <span
            className="cl-caret"
            style={{
              display: "inline-block",
              width: 7,
              height: 13,
              background: "var(--cosmetic-accent)",
              boxShadow: "0 0 8px var(--cosmetic-accent)",
              marginLeft: 4,
              verticalAlign: -2,
              animation: "cl-blink 1s step-end infinite",
            }}
          />
        </div>

        {/* Head */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 24,
            marginBottom: 12,
          }}
        >
          <div>
            <span
              style={{
                display: "block",
                ...MONO,
                fontWeight: 500,
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#7F7BA9",
                marginBottom: 14,
              }}
            >
              <span style={{ color: "#44406B" }}>{"// "}</span>
              SAISON · {season ? String(season.index).padStart(2, "0") : "--"} ·{" "}
              <b style={{ color: "var(--cosmetic-accent)", fontWeight: 500 }}>LIVE</b>
            </span>
            <h1
              style={{
                ...DISPLAY,
                fontWeight: 800,
                fontSize: "clamp(40px, 5.5vw, 72px)",
                lineHeight: 1,
                letterSpacing: "-0.035em",
                color: "#F5F5FA",
                margin: 0,
              }}
            >
              <em
                style={{
                  fontStyle: "normal",
                  background: "linear-gradient(135deg, #0024FF 0%, var(--cosmetic-accent) 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Classement
              </em>{" "}
              {filter === "league" ? "ligue." : filter === "friends" ? "entre amis." : "global."}
            </h1>
          </div>

          {/* Filter pills */}
          <div
            style={{
              display: "inline-flex",
              flexWrap: "wrap",
              maxWidth: "100%",
              border: "1px solid #2A2560",
              background: "rgba(5,4,26,0.5)",
              padding: 3,
            }}
          >
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setFilter(f.id);
                }}
                style={{
                  background:
                    filter === f.id
                      ? "color-mix(in srgb, var(--cosmetic-accent) 8%, transparent)"
                      : "transparent",
                  border: 0,
                  cursor: "pointer",
                  padding: "11px 20px",
                  ...MONO,
                  fontWeight: 600,
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: filter === f.id ? "var(--cosmetic-accent)" : "#7F7BA9",
                  boxShadow:
                    filter === f.id
                      ? "inset 0 0 0 1px color-mix(in srgb, var(--cosmetic-accent) 45%, transparent)"
                      : "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 150ms ease",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "currentColor",
                    opacity: filter === f.id ? 1 : 0.55,
                    boxShadow: filter === f.id ? "0 0 8px var(--cosmetic-accent)" : "none",
                  }}
                />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Meta strip */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 16,
            ...MONO,
            fontSize: 11,
            color: "#7F7BA9",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            margin: "18px 0 48px",
            paddingBottom: 18,
            borderBottom: "1px dashed #2A2560",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--cosmetic-accent)",
            }}
          >
            <span
              className="cl-live-dot"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--cosmetic-accent)",
                boxShadow: "0 0 8px var(--cosmetic-accent)",
                animation: "cl-pulse 2s ease-in-out infinite",
              }}
            />
            SESSION SÉCURISÉE
          </span>
          <span style={{ color: "#44406B" }}>/</span>
          <span>
            <b style={{ color: "#B8B5D1" }}>{formatNumberFr(entries.length)}</b> joueurs
          </span>
          <span style={{ color: "#44406B" }}>/</span>
          <span>FR · EUROPE</span>
          <span style={{ color: "#44406B" }}>/</span>
          <span>
            maj · <b style={{ color: "#B8B5D1" }}>temps réel</b>
          </span>
        </div>

        {filter === "league" ? (
          <LeagueClient
            season={season}
            membership={membership}
            podLadder={podLadder}
            podMemberCount={podMemberCount}
          />
        ) : filter === "friends" ? (
          <FriendsSection board={friendsBoard} />
        ) : (
          <>
            {/* Podium */}
            {podiumOrder.length >= 3 && (
              <section
                className="cl-podium"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1.15fr 1fr",
                  gap: 24,
                  alignItems: "end",
                  marginBottom: 96,
                }}
              >
                {podiumOrder.map((entry) => (
                  <PodiumCard
                    key={entry.rank}
                    entry={entry}
                    rank={entry.rank}
                    isMe={entry.isCurrentUser}
                  />
                ))}
              </section>
            )}

            {/* Your position banner */}
            <YouBanner entry={currentEntry} userRank={userRank} totalPlayers={entries.length} />

            <section aria-label="Classement des joueurs">
              <div className={styles.sectionHeading}>
                <h2>Les joueurs</h2>
                <span>Top {Math.min(12, entries.length)}</span>
              </div>
              {top12.length === 0 ? (
                <p>Aucun joueur dans le classement pour le moment.</p>
              ) : (
                <ol className={styles.players}>
                  {top12.map((entry) => (
                    <PlayerCard key={entry.rank} entry={entry} />
                  ))}
                </ol>
              )}
              {contextRows.length > 0 ? (
                <>
                  <h2 className={styles.contextHeading}>Autour de toi</h2>
                  <ol className={styles.players} start={contextRows[0]?.rank}>
                    {contextRows.map((entry) => (
                      <PlayerCard key={entry.rank} entry={entry} />
                    ))}
                  </ol>
                </>
              ) : null}
            </section>
          </>
        )}
      </div>
    </>
  );
}
