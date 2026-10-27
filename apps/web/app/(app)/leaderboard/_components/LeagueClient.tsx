"use client";

// Client boundary: the season countdown updates while the league is open.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { PodLadderEntry } from "@cyberlearn/db";
import { FriendMark } from "@/components/friend-mark";
import { DIVISION_LABEL, type LeagueDivisionCode } from "@cyberlearn/lib";
import { DISPLAY, fmtXp, INTERFACE, MONO, PlayerAvatar } from "./shared";
import { EmptyState } from "@/components/empty-state";
import { initialsOf } from "@/lib/avatar/glyphs";

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
/** The accent, as a line or a fill; text in the accent reads its hover shade on carbon. */
const ACCENT = "var(--cosmetic-accent)";
const NEUTRAL_RING = "#74767d";
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
}: {
  division: LeagueDivisionCode;
  size?: "md" | "lg";
}): React.JSX.Element {
  const color = DIVISION_VAR[division];
  const lg = size === "lg";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: lg ? "7px 14px" : "4px 10px",
        border: `1px solid ${color}`,
        // Carbon under the division's colour, on the strip and on the chalk
        // banner alike: the light divisions (Argent, Diamant) vanish on chalk.
        background: "#121418",
        color,
        ...INTERFACE,
        fontWeight: 600,
        fontSize: lg ? 14 : 13,
        lineHeight: 1.2,
      }}
    >
      <span aria-hidden="true" style={{ width: 8, height: 8, flexShrink: 0, background: color }} />
      {DIVISION_LABEL[division]}
    </span>
  );
}

function ZoneChip({ entry }: { entry: PodLadderEntry }): React.JSX.Element {
  if (entry.promotion) {
    return <Chip color={PROMOTE} label="Promu" />;
  }
  if (entry.relegation) {
    return <Chip color={RELEGATE} label="Relégable" />;
  }
  return <span style={{ ...INTERFACE, fontSize: 13, color: "var(--color-text-faint)" }}>·</span>;
}

function Chip({ color, label }: { color: string; label: string }): React.JSX.Element {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 8px",
        border: `1px solid ${color}`,
        color,
        ...INTERFACE,
        fontWeight: 600,
        fontSize: 12,
        lineHeight: 1.3,
      }}
    >
      {label}
    </span>
  );
}

function PodRow({ entry }: { entry: PodLadderEntry }): React.JSX.Element {
  const isMe = entry.isCurrentUser;
  const mono = initialsOf(entry.displayName ?? entry.username ?? "Anonyme");
  const handle = entry.username ?? entry.displayName ?? "Anonyme";
  const accent = isMe ? ACCENT : entry.promotion ? PROMOTE : entry.relegation ? RELEGATE : null;

  const background = isMe ? "#191c22" : "#121418";

  return (
    <div
      className="league-player"
      style={{
        display: "grid",
        gridTemplateColumns: ROW_COLS,
        alignItems: "center",
        gap: 16,
        padding: accent ? "14px 24px 14px 21px" : "14px 24px",
        borderBottom: "1px solid #303137",
        borderLeft: accent ? `3px solid ${accent}` : undefined,
        background,
        position: "relative",
      }}
    >
      {/* rank */}
      <div
        style={{
          ...DISPLAY,
          fontWeight: 700,
          fontSize: 24,
          color: isMe ? "var(--cosmetic-accent-hover)" : (accent ?? "var(--color-text-muted)"),
        }}
      >
        <span
          style={{
            color: "var(--color-text-faint)",
            fontSize: 15,
            fontWeight: 600,
            marginRight: 2,
          }}
        >
          #
        </span>
        {entry.rank}
        {isMe && <span className="league-player__you">Toi</span>}
      </div>

      {/* player */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <PlayerAvatar mono={mono} ring={isMe ? ACCENT : NEUTRAL_RING} size={32} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span
            style={{
              ...DISPLAY,
              fontWeight: 600,
              fontSize: 24,
              lineHeight: 1.1,
              color: "var(--color-text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: "var(--color-text-muted)" }}>@</span>
            {/* A name opens the profile only where the server said it may:
                a PUBLIC member whose profile page is public too. */}
            {entry.hasPublicProfile && entry.username !== null ? (
              <Link href={`/u/${entry.username}`} style={{ color: "inherit" }}>
                {handle}
              </Link>
            ) : (
              handle
            )}
            {/* Set by buildPodLadder on PUBLIC rows only; the name is checked
                again, as on the global board. */}
            {entry.isFriend && !isMe && (entry.username !== null || entry.displayName !== null) ? (
              <FriendMark size={12} />
            ) : null}
          </span>
          <span
            style={{
              ...INTERFACE,
              fontSize: 13,
              color: "var(--color-text-muted)",
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
          fontSize: 30,
          color: "var(--color-text-primary)",
          textAlign: "right",
        }}
      >
        {fmtXp(entry.seasonXp)}
        <span
          style={{
            ...MONO,
            fontSize: 12,
            color: "var(--color-text-muted)",
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
          fontWeight: 700,
          fontSize: 20,
          color: "var(--color-text-secondary)",
        }}
      >
        {entry.level}
      </div>

      {/* zone */}
      <div style={{ justifySelf: "end" }}>
        <ZoneChip entry={entry} />
      </div>
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

export function LeagueClient({
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
    <LeagueBoard
      season={season}
      membership={membership}
      podLadder={podLadder}
      podMemberCount={podMemberCount}
    />
  );
}

function LeagueBoard({
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
  const zoneColor = me?.promotion
    ? PROMOTE
    : me?.relegation
      ? RELEGATE
      : "var(--color-text-secondary)";
  const zoneLabel = me?.promotion
    ? "Zone de promotion"
    : me?.relegation
      ? "Zone de relégation"
      : "Zone neutre";

  return (
    <div className="league-workspace">
      {/* Season strip */}
      <div className="league-season">
        <DivisionBadge division={membership.division} />
        <span className="league-season__sep">/</span>
        <span>
          Saison <b>{String(season.index).padStart(2, "0")}</b>
        </span>
        <span className="league-season__sep">/</span>
        <span>
          Poule de <b>{podMemberCount}</b>
        </span>
        <span className="league-season__sep">/</span>
        <span suppressHydrationWarning className="league-season__countdown">
          {done
            ? "Clôture en cours"
            : `Fin dans ${String(days)}j ${String(hours)}h ${String(minutes)}m`}
        </span>
      </div>

      {/* Your league: the position, on chalk */}
      <section
        className="league-position"
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto auto",
          alignItems: "center",
          gap: 32,
          padding: "24px 32px",
          marginBottom: 48,
          border: "1px solid var(--color-border-default)",
          borderLeft: `3px solid ${ACCENT}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            ...INTERFACE,
            fontWeight: 600,
            fontSize: 13,
            color: "var(--color-text-secondary)",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <span>Ta ligue</span>
          <DivisionBadge division={membership.division} size="lg" />
        </div>

        {/* big rank */}
        <div
          style={{
            ...DISPLAY,
            fontWeight: 700,
            fontSize: 56,
            lineHeight: 0.9,
            display: "inline-flex",
            alignItems: "baseline",
            gap: 4,
          }}
        >
          <span style={{ color: "var(--color-text-muted)", fontSize: 28, fontWeight: 600 }}>#</span>
          <span style={{ color: "var(--cosmetic-accent-ink)" }}>{myRank ?? "-"}</span>
          <span
            style={{ ...MONO, fontSize: 16, color: "var(--color-text-muted)", fontWeight: 500 }}
          >
            / {podMemberCount}
          </span>
        </div>

        {/* season XP */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, textAlign: "right" }}>
          <span style={{ ...INTERFACE, fontSize: 13, color: "var(--color-text-muted)" }}>
            XP de la saison
          </span>
          <span
            style={{
              ...DISPLAY,
              fontWeight: 700,
              fontSize: 32,
              lineHeight: 1,
              color: "var(--color-text-primary)",
            }}
          >
            {fmtXp(membership.seasonXp)}
          </span>
        </div>

        {/* zone */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, textAlign: "right" }}>
          <span style={{ ...INTERFACE, fontSize: 13, color: "var(--color-text-muted)" }}>
            Statut
          </span>
          <span
            style={{
              ...DISPLAY,
              fontWeight: 700,
              fontSize: 20,
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
          flexWrap: "wrap",
          gap: 16,
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h3 className="section-head">Ta poule</h3>
        <span style={{ ...INTERFACE, fontSize: 13, color: "var(--color-text-muted)" }}>
          <b style={{ color: PROMOTE }}>↑ Promotion</b>
          <span style={{ color: "var(--color-text-faint)", margin: "0 8px" }}>/</span>
          <b style={{ color: RELEGATE }}>↓ Relégation</b>
        </span>
      </div>

      <div
        className="card league-ladder"
        style={{
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* header */}
        <div
          className="league-ladder__head"
          style={{
            display: "grid",
            gridTemplateColumns: ROW_COLS,
            alignItems: "center",
            gap: 16,
            padding: "12px 24px",
            borderBottom: "1px solid var(--color-border-default)",
            background: "#0d0e12",
            ...INTERFACE,
            fontSize: 13,
            color: "var(--color-text-muted)",
            fontWeight: 600,
          }}
        >
          <span>#</span>
          <span>Joueur</span>
          <span style={{ textAlign: "right" }}>XP de la saison</span>
          <span>Niveau</span>
          <span style={{ justifySelf: "end" }}>Zone</span>
        </div>

        {podLadder.map((entry) => (
          <PodRow key={entry.rank} entry={entry} />
        ))}
      </div>
    </div>
  );
}
