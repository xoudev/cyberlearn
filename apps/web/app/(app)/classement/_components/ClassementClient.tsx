"use client";

import React, { useState } from "react";
import type { LeaderboardEntry, PodLadderEntry } from "@cyberlearn/db";
import type { LeagueDivisionCode } from "@cyberlearn/lib";
import { DISPLAY, fmtXp, getMonogram, HexAvatar, MONO } from "./shared";
import { LigueClient } from "./LigueClient";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTier(level: number): string {
  if (level >= 28) return "Maître";
  if (level >= 20) return "Expert";
  if (level >= 10) return "Adepte";
  return "Novice";
}

function getTierClass(level: number): "master" | "expert" | "adept" | "novice" {
  if (level >= 28) return "master";
  if (level >= 20) return "expert";
  if (level >= 10) return "adept";
  return "novice";
}

// ── Style constants ────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, { color: string; border: string }> = {
  master: { color: "#FFB547", border: "rgba(255,181,71,0.4)" },
  expert: { color: "#0AFFD4", border: "rgba(10,255,212,0.4)" },
  adept: { color: "#6E8BFF", border: "rgba(110,139,255,0.4)" },
  novice: { color: "#6B6890", border: "rgba(107,104,144,0.4)" },
};

const RK_COLORS: Record<number, { color: string; grad: string }> = {
  1: { color: "#FFB547", grad: "linear-gradient(135deg, #FFE08A 0%, #FFB547 50%, #FF8E1F 100%)" },
  2: { color: "#C8CFE2", grad: "linear-gradient(135deg, #F0F2F8 0%, #B8B5D1 50%, #6F6B99 100%)" },
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
    ? { color: "#0AFFD4", grad: "linear-gradient(135deg, #5FFFE6 0%, #0AFFD4 50%, #0024FF 100%)" }
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
            ? "0 0 0 1px rgba(10,255,212,0.4) inset, 0 0 28px rgba(10,255,212,0.3)"
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
            color: "#0AFFD4",
            background: "rgba(10,255,212,0.1)",
            border: "1px solid rgba(10,255,212,0.5)",
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
        <span style={{ color: "#0AFFD4", ...MONO, fontWeight: 500, fontSize: isGold ? 20 : 16 }}>
          @
        </span>
        {entry.username ?? entry.displayName ?? "Anonyme"}
      </h2>
      <p
        style={{
          ...MONO,
          fontSize: 11,
          letterSpacing: "0.1em",
          color: "#6B6890",
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
            color: "#6B6890",
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

function YouBanner({
  entry,
  userRank,
  totalPlayers,
}: { entry: LeaderboardEntry | null; userRank: number; totalPlayers: number }) {
  const handle = entry?.username ?? entry?.displayName ?? "moi";
  const tier = entry ? getTier(entry.level) : "-";
  const topPct = totalPlayers > 0 ? Math.round((userRank / totalPlayers) * 100) : 0;

  return (
    <section
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "auto auto 1fr auto auto",
        alignItems: "center",
        gap: 32,
        padding: "24px 32px 24px 36px",
        marginBottom: 56,
        background:
          "linear-gradient(90deg, rgba(10,255,212,0.07) 0%, transparent 50%), rgba(5,4,26,0.6)",
        border: "1px solid #2A2560",
        borderLeft: "3px solid #0AFFD4",
        boxShadow: "-1px 0 24px rgba(10,255,212,0.25), inset 0 0 0 1px rgba(10,255,212,0.04)",
        overflow: "hidden",
      }}
    >
      {/* scanline texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(10,255,212,0.03) 0, rgba(10,255,212,0.03) 1px, transparent 1px, transparent 4px)",
          pointerEvents: "none",
        }}
      />

      {/* eyebrow */}
      <div
        style={{
          ...MONO,
          fontWeight: 700,
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "#0AFFD4",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <span>
          <span style={{ color: "#0AFFD4" }}>&gt; </span>TA POSITION
        </span>
        <span style={{ color: "#6B6890", letterSpacing: "0.14em" }}>SESSION · LIVE</span>
      </div>

      {/* big rank */}
      <div
        style={{
          ...DISPLAY,
          fontWeight: 800,
          fontSize: 64,
          lineHeight: 0.9,
          letterSpacing: "-0.045em",
          display: "inline-flex",
          alignItems: "baseline",
          gap: 4,
        }}
      >
        <span style={{ color: "#6B6890", fontSize: 32, fontWeight: 600 }}>#</span>
        <span
          style={{
            background: "linear-gradient(180deg, #F5F5FA, #0AFFD4)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {userRank}
        </span>
      </div>

      {/* handle + delta */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <h2
          style={{
            ...DISPLAY,
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: "-0.01em",
            color: "#F5F5FA",
            margin: 0,
          }}
        >
          <span style={{ color: "#0AFFD4", ...MONO, fontWeight: 500 }}>@</span>
          {handle}
        </h2>
        <span
          style={{
            ...MONO,
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#6B6890",
          }}
        >
          Top <b style={{ color: "#0AFFD4", fontWeight: 700 }}>{topPct}%</b>
          <span style={{ color: "#44406B", margin: "0 8px" }}>/</span>
          {totalPlayers.toLocaleString("fr-FR")} joueurs
        </span>
      </div>

      {/* separator */}
      <span style={{ width: 1, alignSelf: "stretch", background: "#2A2560" }} />

      {/* XP metric */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, textAlign: "right" }}>
        <span
          style={{
            ...MONO,
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#6B6890",
          }}
        >
          XP TOTAL
        </span>
        <span
          style={{
            ...DISPLAY,
            fontWeight: 800,
            fontSize: 28,
            letterSpacing: "-0.02em",
            background: "linear-gradient(180deg, #F5F5FA, #0AFFD4)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {entry ? fmtXp(entry.xpTotal) : "-"}
        </span>
      </div>

      {/* level metric */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, textAlign: "right" }}>
        <span
          style={{
            ...MONO,
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#6B6890",
          }}
        >
          NIVEAU · {tier.toUpperCase()}
        </span>
        <span
          style={{
            ...DISPLAY,
            fontWeight: 800,
            fontSize: 28,
            letterSpacing: "-0.02em",
            color: "#F5F5FA",
          }}
        >
          {entry?.level ?? "-"}
        </span>
      </div>
    </section>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────

function TableRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  const mono = getMonogram(entry.displayName, entry.username);
  const tier = getTier(entry.level);
  const tc = getTierClass(entry.level);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const tierStyle = TIER_COLORS[tc] ?? TIER_COLORS.novice!;

  const rkColors = RK_COLORS[entry.rank];
  const rankGrad = isMe
    ? "linear-gradient(135deg, #0AFFD4, #0024FF)"
    : rkColors
      ? rkColors.grad
      : "linear-gradient(135deg, #0AFFD4, #0024FF)";

  const rankColor = isMe ? "#0AFFD4" : rkColors?.color;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "80px minmax(0,1fr) 160px 130px 120px",
        alignItems: "center",
        gap: 16,
        padding: isMe ? "14px 24px 14px 21px" : "14px 24px",
        borderBottom: "1px solid rgba(31,27,71,0.5)",
        borderLeft: isMe ? "3px solid #0AFFD4" : undefined,
        background: isMe
          ? "linear-gradient(90deg, rgba(10,255,212,0.10) 0%, rgba(10,255,212,0.02) 60%, transparent 100%)"
          : undefined,
        transition: "background 150ms ease",
        position: "relative",
      }}
    >
      {/* rank */}
      <div
        style={{
          ...DISPLAY,
          fontWeight: 800,
          fontSize: 22,
          letterSpacing: "-0.02em",
          color: rankColor ?? "#6B6890",
        }}
      >
        <span style={{ color: "#44406B", fontSize: 14, fontWeight: 600, marginRight: 2 }}>#</span>
        {entry.rank}
      </div>

      {/* player */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <HexAvatar mono={mono} grad={rankGrad} size={28} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span
            style={{
              ...DISPLAY,
              fontWeight: 600,
              fontSize: 14,
              color: "#F5F5FA",
              letterSpacing: "-0.005em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: "#0AFFD4", ...MONO, fontWeight: 500 }}>@</span>
            {entry.username ?? entry.displayName ?? "Anonyme"}
          </span>
          <span
            style={{
              ...MONO,
              fontSize: 11,
              color: "#6B6890",
              letterSpacing: "0.04em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {entry.displayName ?? ""}
          </span>
        </div>
      </div>

      {/* XP */}
      <div
        style={{
          ...DISPLAY,
          fontWeight: 700,
          fontSize: 18,
          letterSpacing: "-0.01em",
          color: "#F5F5FA",
          textAlign: "right",
        }}
      >
        {fmtXp(entry.xpTotal)}
        <span
          style={{
            ...MONO,
            fontSize: 10,
            color: "#6B6890",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontWeight: 500,
            marginLeft: 4,
          }}
        >
          XP
        </span>
      </div>

      {/* level */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          ...MONO,
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#6B6890",
        }}
      >
        <span
          style={{
            ...DISPLAY,
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: "-0.02em",
            color: "#F5F5FA",
          }}
        >
          {entry.level}
        </span>
        <span
          style={{
            padding: "3px 8px",
            border: `1px solid ${tierStyle.border}`,
            color: tierStyle.color,
            fontSize: 9.5,
            letterSpacing: "0.18em",
          }}
        >
          {tier}
        </span>
      </div>

      {/* streak */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          ...MONO,
          fontSize: 12,
          color: "#B8B5D1",
          justifySelf: "end",
        }}
      >
        <span
          style={{
            color: entry.streakDays > 0 ? "#FFB547" : "#44406B",
            filter: entry.streakDays > 0 ? "drop-shadow(0 0 8px rgba(255,181,71,0.5))" : "none",
          }}
        >
          <FlameIcon size={14} />
        </span>
        <span
          style={{
            ...DISPLAY,
            fontWeight: 700,
            fontSize: 16,
            color: entry.streakDays > 0 ? "#FFB547" : "#6B6890",
            letterSpacing: "-0.01em",
          }}
        >
          {entry.streakDays}
        </span>
        <span>j</span>
      </div>

      {/* TOI label */}
      {isMe && (
        <span
          style={{
            position: "absolute",
            right: 24,
            top: "50%",
            transform: "translateY(-50%)",
            ...MONO,
            fontWeight: 700,
            fontSize: 9,
            letterSpacing: "0.22em",
            color: "#0AFFD4",
            background: "rgba(10,255,212,0.12)",
            border: "1px solid rgba(10,255,212,0.4)",
            padding: "3px 8px",
          }}
        >
          › TOI
        </span>
      )}
    </div>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

interface Props {
  entries: LeaderboardEntry[];
  userRank: number;
  currentEntry: LeaderboardEntry | null;
  season: { index: number; startsAt: number; endsAt: number } | null;
  membership: { division: LeagueDivisionCode; pod: number; seasonXp: number } | null;
  podLadder: PodLadderEntry[];
  podMemberCount: number;
}

export function ClassementClient({
  entries,
  userRank,
  currentEntry,
  season,
  membership,
  podLadder,
  podMemberCount,
}: Props): React.JSX.Element {
  const [filter, setFilter] = useState<"global" | "mois" | "sem" | "ligue">("global");

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
    { id: "ligue" as const, label: "Ligue" },
    { id: "mois" as const, label: "Ce mois" },
    { id: "sem" as const, label: "Cette semaine" },
  ];

  return (
    <>
      <style>{`
        @keyframes cl-blink { 0%,50%{opacity:1} 50.01%,100%{opacity:0} }
        @keyframes cl-pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        @media (prefers-reduced-motion:reduce){.cl-caret{animation:none!important}.cl-live-dot{animation:none!important}}
        .cl-row:not(.cl-row-head):hover{background:rgba(10,255,212,0.03)!important}
      `}</style>

      <div className="page-container">
        {/* Breadcrumb */}
        <div
          style={{
            ...MONO,
            fontSize: 12,
            letterSpacing: "0.04em",
            color: "#6B6890",
            marginBottom: 28,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "#0AFFD4" }}>$</span>
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
              background: "#0AFFD4",
              boxShadow: "0 0 8px #0AFFD4",
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
                color: "#6B6890",
                marginBottom: 14,
              }}
            >
              <span style={{ color: "#44406B" }}>{"// "}</span>
              SAISON · {season ? String(season.index).padStart(2, "0") : "--"} ·{" "}
              <b style={{ color: "#0AFFD4", fontWeight: 500 }}>LIVE</b>
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
                  background: "linear-gradient(135deg, #0024FF 0%, #0AFFD4 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Classement
              </em>{" "}
              {filter === "ligue" ? "ligue." : "global."}
            </h1>
          </div>

          {/* Filter pills */}
          <div
            style={{
              display: "inline-flex",
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
                  background: filter === f.id ? "rgba(10,255,212,0.08)" : "transparent",
                  border: 0,
                  cursor: "pointer",
                  padding: "11px 20px",
                  ...MONO,
                  fontWeight: 600,
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: filter === f.id ? "#0AFFD4" : "#6B6890",
                  boxShadow: filter === f.id ? "inset 0 0 0 1px rgba(10,255,212,0.45)" : "none",
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
                    boxShadow: filter === f.id ? "0 0 8px #0AFFD4" : "none",
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
            alignItems: "center",
            gap: 16,
            ...MONO,
            fontSize: 11,
            color: "#6B6890",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            margin: "18px 0 48px",
            paddingBottom: 18,
            borderBottom: "1px dashed #2A2560",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#0AFFD4" }}>
            <span
              className="cl-live-dot"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#0AFFD4",
                boxShadow: "0 0 8px #0AFFD4",
                animation: "cl-pulse 2s ease-in-out infinite",
              }}
            />
            SESSION SÉCURISÉE
          </span>
          <span style={{ color: "#44406B" }}>/</span>
          <span>
            <b style={{ color: "#B8B5D1" }}>{entries.length.toLocaleString("fr-FR")}</b> joueurs
          </span>
          <span style={{ color: "#44406B" }}>/</span>
          <span>FR · EUROPE</span>
          <span style={{ color: "#44406B" }}>/</span>
          <span>
            maj · <b style={{ color: "#B8B5D1" }}>temps réel</b>
          </span>
        </div>

        {filter === "ligue" ? (
          <LigueClient
            season={season}
            membership={membership}
            podLadder={podLadder}
            podMemberCount={podMemberCount}
          />
        ) : (
          <>
            {/* Podium */}
            {podiumOrder.length >= 3 && (
              <section
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

            {/* Table */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <h3
                  style={{
                    ...MONO,
                    fontWeight: 600,
                    fontSize: 12,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "#B8B5D1",
                    margin: 0,
                  }}
                >
                  <span style={{ color: "#6B6890" }}>{"// "}</span>JOUEURS · TOP MONDIAL
                </h3>
                <span
                  style={{
                    ...MONO,
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    color: "#6B6890",
                    textTransform: "uppercase",
                  }}
                >
                  <b style={{ color: "#F5F5FA" }}>1–{Math.min(12, entries.length)}</b> sur{" "}
                  {entries.length.toLocaleString("fr-FR")}
                </span>
              </div>

              <div
                style={{
                  position: "relative",
                  border: "1px solid #2A2560",
                  background: "rgba(5,4,26,0.5)",
                  overflow: "hidden",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px minmax(0,1fr) 160px 130px 120px",
                    alignItems: "center",
                    gap: 16,
                    padding: "12px 24px",
                    borderBottom: "1px solid #2A2560",
                    background: "rgba(0,0,0,0.25)",
                    ...MONO,
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "#6B6890",
                    fontWeight: 600,
                  }}
                >
                  <span>#</span>
                  <span>JOUEUR</span>
                  <span style={{ textAlign: "right" }}>XP TOTAL</span>
                  <span>NIVEAU</span>
                  <span style={{ justifySelf: "end" }}>STREAK</span>
                </div>

                {/* Top rows */}
                {top12.map((entry) => (
                  <TableRow key={entry.rank} entry={entry} isMe={entry.isCurrentUser} />
                ))}

                {/* Ellipsis */}
                {userRank > 15 && contextRows.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 14,
                      padding: "14px 24px",
                      borderBottom: "1px solid rgba(31,27,71,0.5)",
                      ...MONO,
                      fontSize: 11,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "#6B6890",
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        height: 1,
                        background:
                          "repeating-linear-gradient(90deg, #2A2560 0, #2A2560 4px, transparent 4px, transparent 8px)",
                      }}
                    />
                    ··· {Math.max(0, userRank - 14)} joueurs ···
                    <span
                      style={{
                        flex: 1,
                        height: 1,
                        background:
                          "repeating-linear-gradient(90deg, #2A2560 0, #2A2560 4px, transparent 4px, transparent 8px)",
                      }}
                    />
                  </div>
                )}

                {/* Context rows around current user */}
                {userRank > 15 &&
                  contextRows.map((entry) => (
                    <TableRow key={entry.rank} entry={entry} isMe={entry.isCurrentUser} />
                  ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
