"use client";

import React, { useEffect, useState } from "react";
import type { PodLadderEntry } from "@cyberlearn/db";
import { DIVISION_LABEL, type LeagueDivisionCode } from "@cyberlearn/lib";
import { DISPLAY, fmtXp, getMonogram, HexAvatar, MONO } from "./shared";

// ── Palette ──────────────────────────────────────────────────────────────────

const DIVISION_VAR: Record<LeagueDivisionCode, string> = {
  BRONZE: "var(--color-division-bronze)",
  ARGENT: "var(--color-division-argent)",
  OR: "var(--color-division-or)",
  PLATINE: "var(--color-division-platine)",
  DIAMANT: "var(--color-division-diamant)",
};

const PROMOTE = "var(--color-promote)";
const RELEGATE = "var(--color-relegate)";
const CYAN = "#0AFFD4";
const CYAN_GRAD = "linear-gradient(135deg, #0AFFD4, #0024FF)";
const NEUTRAL_GRAD = "linear-gradient(135deg, #3a3668, #211d4d)";
const ROW_COLS = "80px minmax(0,1fr) 160px 130px 120px";

// ── Countdown ────────────────────────────────────────────────────────────────

function useCountdown(targetMs: number): {
  days: number;
  hours: number;
  minutes: number;
  done: boolean;
} {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, []);
  const remaining = Math.max(0, targetMs - now);
  const totalSeconds = Math.floor(remaining / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    done: remaining <= 0,
  };
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function DivisionBadge({
  division,
  size = "md",
}: { division: LeagueDivisionCode; size?: "md" | "lg" }): React.JSX.Element {
  const color = DIVISION_VAR[division];
  const lg = size === "lg";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: lg ? "8px 16px" : "5px 12px",
        border: `1px solid color-mix(in srgb, ${color} 55%, transparent)`,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
        ...MONO,
        fontWeight: 700,
        fontSize: lg ? 13 : 11,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
      }}
    >
      <span
        style={{
          width: lg ? 9 : 7,
          height: lg ? 9 : 7,
          background: color,
          clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
          boxShadow: `0 0 8px ${color}`,
        }}
      />
      {DIVISION_LABEL[division]}
    </span>
  );
}

function ZoneChip({ entry }: { entry: PodLadderEntry }): React.JSX.Element {
  if (entry.promotion) {
    return <Chip color={PROMOTE} label="PROMU" />;
  }
  if (entry.relegation) {
    return <Chip color={RELEGATE} label="RELÉGABLE" />;
  }
  return <span style={{ ...MONO, fontSize: 12, color: "#44406B", letterSpacing: "0.1em" }}>·</span>;
}

function Chip({ color, label }: { color: string; label: string }): React.JSX.Element {
  return (
    <span
      style={{
        padding: "3px 9px",
        border: `1px solid color-mix(in srgb, ${color} 45%, transparent)`,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
        ...MONO,
        fontWeight: 700,
        fontSize: 9.5,
        letterSpacing: "0.16em",
      }}
    >
      {label}
    </span>
  );
}

function PodRow({ entry }: { entry: PodLadderEntry }): React.JSX.Element {
  const isMe = entry.isCurrentUser;
  const mono = getMonogram(entry.displayName, entry.username);
  const handle = entry.username ?? entry.displayName ?? "Anonyme";
  const accent = isMe ? CYAN : entry.promotion ? PROMOTE : entry.relegation ? RELEGATE : null;

  const background = isMe
    ? "linear-gradient(90deg, rgba(10,255,212,0.10) 0%, rgba(10,255,212,0.02) 60%, transparent 100%)"
    : entry.promotion
      ? "linear-gradient(90deg, color-mix(in srgb, var(--color-promote) 9%, transparent), transparent 70%)"
      : entry.relegation
        ? "linear-gradient(90deg, color-mix(in srgb, var(--color-relegate) 9%, transparent), transparent 70%)"
        : undefined;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: ROW_COLS,
        alignItems: "center",
        gap: 16,
        padding: accent ? "14px 24px 14px 21px" : "14px 24px",
        borderBottom: "1px solid rgba(31,27,71,0.5)",
        borderLeft: accent ? `3px solid ${accent}` : undefined,
        background,
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
          color: accent ?? "#6B6890",
        }}
      >
        <span style={{ color: "#44406B", fontSize: 14, fontWeight: 600, marginRight: 2 }}>#</span>
        {entry.rank}
      </div>

      {/* player */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <HexAvatar mono={mono} grad={isMe ? CYAN_GRAD : NEUTRAL_GRAD} size={28} />
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
            <span style={{ color: CYAN, ...MONO, fontWeight: 500 }}>@</span>
            {handle}
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

      {/* season XP */}
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
        {fmtXp(entry.seasonXp)}
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
          ...DISPLAY,
          fontWeight: 800,
          fontSize: 18,
          letterSpacing: "-0.02em",
          color: "#B8B5D1",
        }}
      >
        {entry.level}
      </div>

      {/* zone */}
      <div style={{ justifySelf: "end" }}>
        <ZoneChip entry={entry} />
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
            color: CYAN,
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

function EmptyState({ title, message }: { title: string; message: string }): React.JSX.Element {
  return (
    <div
      style={{
        border: "1px dashed #2A2560",
        background: "rgba(5,4,26,0.5)",
        padding: "64px 32px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          ...DISPLAY,
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: "-0.01em",
          color: "#F5F5FA",
          margin: "0 0 10px",
        }}
      >
        {title}
      </p>
      <p style={{ ...MONO, fontSize: 13, color: "#6B6890", letterSpacing: "0.04em", margin: 0 }}>
        {message}
      </p>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  season: { index: number; startsAt: number; endsAt: number } | null;
  membership: { division: LeagueDivisionCode; pod: number; seasonXp: number } | null;
  podLadder: PodLadderEntry[];
  podMemberCount: number;
}

export function LigueClient({
  season,
  membership,
  podLadder,
  podMemberCount,
}: Props): React.JSX.Element {
  if (!season) {
    return (
      <EmptyState
        title="La ligue démarre bientôt"
        message="La première saison ouvrira sous peu. Reviens défendre ta place."
      />
    );
  }
  if (!membership) {
    return (
      <EmptyState
        title="Pas encore en lice"
        message="Gagne de l'XP cette semaine pour rejoindre une poule et lancer ta saison."
      />
    );
  }

  return (
    <LigueBoard
      season={season}
      membership={membership}
      podLadder={podLadder}
      podMemberCount={podMemberCount}
    />
  );
}

function LigueBoard({
  season,
  membership,
  podLadder,
  podMemberCount,
}: {
  season: { index: number; startsAt: number; endsAt: number };
  membership: { division: LeagueDivisionCode; pod: number; seasonXp: number };
  podLadder: PodLadderEntry[];
  podMemberCount: number;
}): React.JSX.Element {
  const { days, hours, minutes, done } = useCountdown(season.endsAt);
  const me = podLadder.find((e) => e.isCurrentUser) ?? null;
  const myRank = me?.rank ?? null;
  const zoneColor = me?.promotion ? PROMOTE : me?.relegation ? RELEGATE : "#B8B5D1";
  const zoneLabel = me?.promotion
    ? "Zone de promotion"
    : me?.relegation
      ? "Zone de relégation"
      : "Zone neutre";

  return (
    <div>
      {/* Season strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          ...MONO,
          fontSize: 11,
          color: "#6B6890",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 28,
          paddingBottom: 18,
          borderBottom: "1px dashed #2A2560",
        }}
      >
        <DivisionBadge division={membership.division} />
        <span style={{ color: "#44406B" }}>/</span>
        <span>
          Saison <b style={{ color: "#B8B5D1" }}>{String(season.index).padStart(2, "0")}</b>
        </span>
        <span style={{ color: "#44406B" }}>/</span>
        <span>
          Poule de <b style={{ color: "#B8B5D1" }}>{podMemberCount}</b>
        </span>
        <span style={{ color: "#44406B" }}>/</span>
        <span suppressHydrationWarning style={{ color: CYAN }}>
          {done
            ? "Clôture en cours"
            : `Fin dans ${String(days)}j ${String(hours)}h ${String(minutes)}m`}
        </span>
      </div>

      {/* TA LIGUE banner */}
      <section
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto auto",
          alignItems: "center",
          gap: 32,
          padding: "24px 32px",
          marginBottom: 48,
          background:
            "linear-gradient(90deg, rgba(10,255,212,0.07) 0%, transparent 50%), rgba(5,4,26,0.6)",
          border: "1px solid #2A2560",
          borderLeft: `3px solid ${CYAN}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            ...MONO,
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: CYAN,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <span>
            <span style={{ color: CYAN }}>&gt; </span>TA LIGUE
          </span>
          <DivisionBadge division={membership.division} size="lg" />
        </div>

        {/* big rank */}
        <div
          style={{
            ...DISPLAY,
            fontWeight: 800,
            fontSize: 56,
            lineHeight: 0.9,
            letterSpacing: "-0.045em",
            display: "inline-flex",
            alignItems: "baseline",
            gap: 4,
          }}
        >
          <span style={{ color: "#6B6890", fontSize: 28, fontWeight: 600 }}>#</span>
          <span
            style={{
              background: "linear-gradient(180deg, #F5F5FA, #0AFFD4)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {myRank ?? "-"}
          </span>
          <span style={{ ...MONO, fontSize: 16, color: "#6B6890", fontWeight: 500 }}>
            / {podMemberCount}
          </span>
        </div>

        {/* season XP */}
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
            XP SAISON
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
            {fmtXp(membership.seasonXp)}
          </span>
        </div>

        {/* zone */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, textAlign: "right" }}>
          <span
            style={{
              ...MONO,
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#6B6890",
            }}
          >
            STATUT
          </span>
          <span
            style={{
              ...DISPLAY,
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: "-0.01em",
              color: zoneColor,
            }}
          >
            {zoneLabel}
          </span>
        </div>
      </section>

      {/* Pod ladder */}
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
          <span style={{ color: "#6B6890" }}>{"// "}</span>POULE · CLASSEMENT VIF
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
          <b style={{ color: PROMOTE }}>↑ promotion</b>
          <span style={{ color: "#44406B", margin: "0 8px" }}>/</span>
          <b style={{ color: RELEGATE }}>↓ relégation</b>
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
        {/* header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: ROW_COLS,
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
          <span style={{ textAlign: "right" }}>XP SAISON</span>
          <span>NIVEAU</span>
          <span style={{ justifySelf: "end" }}>ZONE</span>
        </div>

        {podLadder.map((entry) => (
          <PodRow key={entry.rank} entry={entry} />
        ))}
      </div>
    </div>
  );
}
