import React from "react";
import Image from "next/image";
import { requireRequestUser } from "@/lib/auth";
import { leaderboardRepository, type LeaderboardEntry } from "@cyberlearn/db";

export const metadata = { title: "Classement · CyberLearn" };

export default async function LeaderboardPage(): Promise<React.JSX.Element> {
  const authUser = await requireRequestUser();
  const [entries, userRank] = await Promise.all([
    leaderboardRepository.findTopUsers(100),
    leaderboardRepository.findUserRank(authUser.id),
  ]);

  const currentUser = entries.find((e) => e.userId === authUser.id);

  return (
    <div className="leaderboard-page">
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#6B6890",
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <span style={{ width: 20, height: 1, background: "#0AFFD4", display: "inline-block" }} />
          Classement global
        </div>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 30,
            fontWeight: 700,
            color: "#F5F5FA",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Top apprenants
        </h1>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "#6B6890",
            margin: "8px 0 0",
            letterSpacing: "0.04em",
          }}
        >
          Classé par XP total · {String(entries.length)} joueurs
        </p>
      </div>

      {/* Current user banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(10,255,212,0.06), rgba(0,36,255,0.04))",
          border: "1px solid rgba(10,255,212,0.2)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#6B6890",
          }}
        >
          Ta position
        </div>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 28,
            fontWeight: 700,
            color: "#0AFFD4",
            letterSpacing: "-0.02em",
          }}
        >
          #{String(userRank)}
        </div>
        {currentUser && (
          <>
            <div style={{ width: 1, height: 32, background: "#2A2560" }} />
            <UserAvatar entry={currentUser} size={32} />
            <div>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#F5F5FA",
                }}
              >
                {currentUser.displayName ?? currentUser.username ?? "Toi"}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6B6890" }}>
                {String(currentUser.xpTotal)} XP · LVL {String(currentUser.level)}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Podium — top 3 */}
      {entries.length >= 3 && (
        <div className="leaderboard-podium">
          {([entries[1], entries[0], entries[2]] as LeaderboardEntry[]).map((entry, podiumIdx) => {
            const rank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
            const actual = entry;
            return (
              <PodiumCard
                key={actual.userId}
                entry={actual}
                rank={rank}
                isCurrentUser={actual.userId === authUser.id}
              />
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div style={{ background: "rgba(5,4,26,0.4)", border: "1px solid #1F1B47" }}>
        <div className="leaderboard-table-scroll">
          <div style={{ minWidth: 560 }}>
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "56px 1fr 120px 100px 80px",
                gap: 0,
                padding: "12px 20px",
                borderBottom: "1px solid #1F1B47",
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#44406B",
              }}
            >
              <span>#</span>
              <span>Joueur</span>
              <span style={{ textAlign: "right" }}>XP Total</span>
              <span style={{ textAlign: "right" }}>Niveau</span>
              <span style={{ textAlign: "right" }}>Série</span>
            </div>

            {entries.map((entry) => (
              <LeaderboardRow
                key={entry.userId}
                entry={entry}
                isCurrentUser={entry.userId === authUser.id}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Podium card ───────────────────────────────────────────────────────────────

interface PodiumColor {
  color: string;
  bg: string;
  border: string;
  label: string;
}
const PODIUM_DEFAULT: PodiumColor = {
  color: "#C87D4A",
  bg: "rgba(200,125,74,0.06)",
  border: "rgba(200,125,74,0.2)",
  label: "Bronze",
};
const PODIUM_COLORS: Record<number, PodiumColor> = {
  1: { color: "#FFB020", bg: "rgba(255,176,32,0.08)", border: "rgba(255,176,32,0.3)", label: "Or" },
  2: {
    color: "#B8B5D1",
    bg: "rgba(184,181,209,0.06)",
    border: "rgba(184,181,209,0.2)",
    label: "Argent",
  },
  3: PODIUM_DEFAULT,
};

function PodiumCard({
  entry,
  rank,
  isCurrentUser,
}: { entry: LeaderboardEntry; rank: number; isCurrentUser: boolean }) {
  const colors = PODIUM_COLORS[rank] ?? PODIUM_DEFAULT;
  const name = entry.displayName ?? entry.username ?? "-";

  return (
    <div
      style={{
        background: isCurrentUser
          ? "linear-gradient(135deg, rgba(10,255,212,0.06), transparent)"
          : colors.bg,
        border: `1px solid ${isCurrentUser ? "rgba(10,255,212,0.25)" : colors.border}`,
        padding: "24px 20px",
        textAlign: "center",
        position: "relative",
      }}
    >
      {/* Rank badge */}
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.12em",
          color: colors.color,
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          padding: "2px 8px",
        }}
      >
        {colors.label}
      </div>

      <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}>
        <UserAvatar entry={entry} size={48} />
      </div>

      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          fontWeight: 600,
          color: "#F5F5FA",
          marginBottom: 4,
        }}
      >
        {name.length > 16 ? name.slice(0, 14) + "…" : name}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: colors.color,
          fontWeight: 700,
          letterSpacing: "0.04em",
        }}
      >
        {String(entry.xpTotal)} XP
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#6B6890", marginTop: 2 }}>
        LVL·{String(entry.level)}
      </div>
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function LeaderboardRow({
  entry,
  isCurrentUser,
}: { entry: LeaderboardEntry; isCurrentUser: boolean }) {
  const name = entry.displayName ?? entry.username ?? "-";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "56px 1fr 120px 100px 80px",
        gap: 0,
        padding: "12px 20px",
        borderBottom: "1px solid #1A1640",
        background: isCurrentUser ? "rgba(10,255,212,0.03)" : "transparent",
        alignItems: "center",
        transition: "background 120ms ease",
        minWidth: 560,
      }}
    >
      {/* Rank */}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 700,
          color: entry.rank <= 3 ? (PODIUM_COLORS[entry.rank]?.color ?? "#6B6890") : "#6B6890",
          letterSpacing: "0.04em",
        }}
      >
        {entry.rank <= 3
          ? (["", "①", "②", "③"][entry.rank] ?? String(entry.rank))
          : `#${String(entry.rank)}`}
      </span>

      {/* User */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <UserAvatar entry={entry} size={28} />
        <div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: isCurrentUser ? 700 : 500,
              color: isCurrentUser ? "#F5F5FA" : "#B8B5D1",
            }}
          >
            {name}
            {isCurrentUser && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "#0AFFD4",
                  marginLeft: 8,
                  letterSpacing: "0.1em",
                }}
              >
                TOI
              </span>
            )}
          </div>
          {entry.username && entry.displayName && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#44406B" }}>
              @{entry.username}
            </div>
          )}
        </div>
      </div>

      {/* XP */}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "#0AFFD4",
          fontWeight: 700,
          letterSpacing: "0.04em",
          textAlign: "right",
        }}
      >
        {String(entry.xpTotal)}
      </span>

      {/* Level */}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "#4D8BFF",
          textAlign: "right",
        }}
      >
        LVL·{String(entry.level)}
      </span>

      {/* Streak */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
        {entry.streakDays > 0 && (
          <svg width="10" height="10" viewBox="0 0 16 16" fill="#FFB020" aria-hidden="true">
            <path d="M8 1C4.5 4 2 7 2 10a6 6 0 0012 0c0-3-2.5-6-6-9z" />
          </svg>
        )}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: entry.streakDays > 0 ? "#FFB020" : "#44406B",
          }}
        >
          {String(entry.streakDays)}j
        </span>
      </div>
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function UserAvatar({ entry, size }: { entry: LeaderboardEntry; size: number }) {
  const name = entry.displayName ?? entry.username ?? "?";
  const realUrl =
    entry.avatarUrl && !entry.avatarUrl.startsWith("__glyph:") ? entry.avatarUrl : null;
  return (
    <div
      style={{
        width: size,
        height: size,
        clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
        background: realUrl ? "transparent" : "linear-gradient(135deg, #0024FF, #0AFFD4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-sans)",
        fontWeight: 700,
        fontSize: Math.round(size * 0.38),
        color: "#030219",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {realUrl ? (
        <Image
          src={realUrl}
          alt=""
          width={size}
          height={size}
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
        />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
}
