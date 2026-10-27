"use client";

// Client boundary: board tabs, optimistic periods and privacy controls react to user input.

import { Tabs } from "@/components/tabs";
import { Pills } from "@/components/pills";
import React, { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { PodLadderEntry } from "@cyberlearn/db";
import type { LeagueDivisionCode } from "@cyberlearn/lib";
import {
  LEADERBOARD_PERIODS,
  LEADERBOARD_PERIOD_LABEL,
  leaderboardPeriodSince,
  type LeaderboardPeriod,
} from "@cyberlearn/lib/gamification/leaderboard-period";
import { DISPLAY, fmtXp, HexAvatar, MONO } from "./shared";
import { LeagueClient } from "./LeagueClient";
import styles from "./leaderboard.module.css";
import "./leaderboard.css";
import { formatNumberFr } from "@cyberlearn/lib";
import { ProgressionHeading } from "@/components/progression-heading";
import { AddFriendChip } from "@/components/add-friend-chip";
import { FriendMark } from "@/components/friend-mark";
import { rankName } from "@cyberlearn/lib/dashboard/rank-name";
import { initialsOf } from "@/lib/avatar/glyphs";
import type { BoardRow, BoardStanding } from "@/lib/leaderboard/boards";
import { leaderboardHref, type LeaderboardView } from "@/lib/leaderboard/query";
import { Switch } from "@/app/(app)/_settings/_components/SettingsControls";
import { setFriendsLeaderboardAction } from "@/app/(app)/_settings/privacy/_actions/update-privacy";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** "28 septembre": when the current season closes, in the header strip. */
const SEASON_END = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

// ── Style constants ────────────────────────────────────────────────────────────

const RK_COLORS: Record<number, { color: string; grad: string }> = {
  1: {
    color: "var(--color-rarity-legendary)",
    grad: "linear-gradient(135deg, #FFE08A 0%, var(--color-rarity-legendary) 50%, #FF8E1F 100%)",
  },
  2: {
    color: "#C8CFE2",
    grad: "linear-gradient(135deg, #F0F2F8 0%, var(--color-text-secondary) 50%, var(--color-text-muted) 100%)",
  },
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

/**
 * Whether a row carries the friend mark. The server sets the flag on rows
 * that show who they are and nowhere else (leaderboard.visibility.ts); the
 * row checks again that it names somebody, because a mark beside "Anonyme"
 * would be the very thing the anonymity was hiding.
 */
export function showsFriendMark(entry: BoardRow): boolean {
  return (
    entry.isFriend &&
    !entry.isCurrentUser &&
    (entry.username !== null || entry.displayName !== null)
  );
}

/**
 * The handle a row's "Ajouter" asks by, or null when the row offers none. The
 * server says where the reader stands only on a PUBLIC row that is not their
 * own (`friendship`, leaderboard.visibility.ts); a friend already carries
 * the mark, and a row without a handle cannot be asked by one.
 */
export function addableHandle(entry: BoardRow): string | null {
  if (entry.isCurrentUser || entry.username === null) return null;
  const view = entry.friendship ?? null;
  if (view === null || view === "friends") return null;
  return entry.username;
}

/** The name on a row, as a link to the profile when the server gave one. */
function PlayerName({
  entry,
  label,
  className,
}: {
  entry: BoardRow;
  label: string;
  className?: string;
}): React.JSX.Element {
  if (entry.profileHref === null) return <>{label}</>;
  return (
    <Link href={entry.profileHref} className={[styles.profileLink, className].join(" ")}>
      {label}
    </Link>
  );
}

// ── Podium card ───────────────────────────────────────────────────────────────

function PodiumCard({
  entry,
  rank,
  isMe,
}: {
  entry: BoardRow;
  rank: number;
  isMe: boolean;
}): React.JSX.Element {
  const name = entry.displayName ?? entry.username ?? "Anonyme";
  return (
    <div
      className={[
        "leaderboard-podium-card",
        entry.profileHref !== null ? styles.linkedCard : "",
      ].join(" ")}
      data-rank={rank}
      data-current={isMe}
    >
      <div className="leaderboard-podium-card__rank">
        <span>Rang</span>
        <strong>{String(rank).padStart(2, "0")}</strong>
        {isMe && <span>Toi</span>}
      </div>
      <HexAvatar
        mono={initialsOf(name)}
        grad={rank === 1 ? "#ff6b2b" : "#aaa79f"}
        size={64}
        src={entry.avatarSrc}
        name={name}
      />
      <h2>
        <PlayerName entry={entry} label={entry.username ?? entry.displayName ?? "Anonyme"} />
        {showsFriendMark(entry) && <FriendMark size={14} />}
      </h2>
      {entry.displayName && entry.username && <p>{entry.displayName}</p>}
      <div className="leaderboard-podium-card__xp">
        <strong>{fmtXp(entry.xpTotal)}</strong>
        <span>XP</span>
      </div>
      <div className="leaderboard-podium-card__footer">
        <span>
          Niveau {entry.level} · {rankName(entry.level)}
        </span>
        <span>
          <FlameIcon size={13} /> {entry.streakDays} j
        </span>
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

/** Who a board leaves out, in the sentence under "Tu n'apparais pas…". */
const UNRANKED_DETAIL: Record<LeaderboardPeriod, string> = {
  all: "Il compte les apprenants à partir de leur premier XP.",
  month: "Il compte les apprenants qui ont gagné de l'XP depuis le début du mois.",
  week: "Il compte les apprenants qui ont gagné de l'XP depuis lundi.",
};

function YouBanner({
  standing,
  totalPlayers,
  period,
}: {
  standing: BoardStanding | null;
  totalPlayers: number;
  period: LeaderboardPeriod;
}) {
  // Not ranked: say why instead of leaving the reader to look for themselves
  // in a list they are not part of.
  if (standing === null) {
    return (
      <aside className={styles.position} aria-label="Ton classement">
        <div className={styles.identity}>
          <strong>Tu n&apos;apparais pas dans ce classement</strong>
          <span>
            {UNRANKED_DETAIL[period]} Un compte de l&apos;équipe ou un profil masqué dans les
            paramètres n&apos;y figure pas.
          </span>
        </div>
      </aside>
    );
  }
  // Over the whole board, not the hundred rows on the page: ranked 240th of
  // 5 000 is the top 5%, which a list of a hundred could never have said.
  const top = topPercentile(standing.rank, totalPlayers);
  return (
    <aside className={styles.position} aria-label="Ton classement">
      <span className={styles.positionRank}>#{standing.rank}</span>
      <div className={styles.identity}>
        <strong>Ta place dans le classement</strong>
        <span>
          {formatNumberFr(totalPlayers)} {totalPlayers > 1 ? "joueurs" : "joueur"}
          {top !== null ? <> · Top {top}&nbsp;%</> : null} · Niveau {standing.level}
        </span>
      </div>
      <strong className={styles.score}>
        {fmtXp(standing.xp)} <small>XP</small>
      </strong>
    </aside>
  );
}

export function PlayerCard({
  entry,
  markFriends = true,
}: {
  entry: BoardRow;
  /** Off on the friends board, where every row but the reader's is a friend. */
  markFriends?: boolean;
}): React.JSX.Element {
  const handle = entry.username ?? entry.displayName ?? "Anonyme";
  return (
    <li
      className={[
        "card card--sunken",
        styles.player,
        entry.isCurrentUser ? styles.currentPlayer : "",
        entry.profileHref !== null ? styles.linkedCard : "",
      ].join(" ")}
    >
      <div className={styles.playerTop}>
        <span className={styles.rank} style={{ color: RK_COLORS[entry.rank]?.color }}>
          #{entry.rank}
        </span>
        {entry.isCurrentUser ? <span className={styles.you}>Toi</span> : null}
        {markFriends && entry.friendship != null && addableHandle(entry) !== null ? (
          // Above the card's stretched profile link, which would take its click.
          <span className={styles.addFriend}>
            <AddFriendChip
              target={{ username: entry.username ?? "" }}
              name={`@${handle}`}
              view={entry.friendship}
            />
          </span>
        ) : null}
      </div>
      <div className={styles.playerIdentity}>
        <HexAvatar
          mono={initialsOf(entry.displayName ?? entry.username ?? "Anonyme")}
          grad={
            RK_COLORS[entry.rank]?.grad ??
            "linear-gradient(135deg, var(--color-rarity-rare), var(--cosmetic-accent))"
          }
          size={44}
          src={entry.avatarSrc}
          name={handle}
        />
        <div className={styles.identity}>
          <div className={styles.nameLine}>
            <strong title={handle}>
              <PlayerName entry={entry} label={`@${handle}`} />
            </strong>
            {markFriends && showsFriendMark(entry) ? <FriendMark /> : null}
          </div>
          <span>
            Niveau {entry.level} · {rankName(entry.level)}
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

/** The friends board as the page draws it: its rows already linked and pictured. */
export interface FriendsBoardView {
  rows: BoardRow[];
  listedForFriends: boolean;
}

/**
 * The friends board.
 *
 * Nobody is anonymised here and nobody is greyed out: on a list this short,
 * "Anonyme" would be a name with one step missing - a reader knows who their own
 * friends are. Somebody is listed under their name because they said so, or
 * they are absent. The switch below says which of the two the reader is, since
 * being on this board says nothing about being on their friends'.
 */
function FriendsSection({
  board,
  period,
}: {
  board: FriendsBoardView;
  period: LeaderboardPeriod;
}): React.JSX.Element {
  const others = board.rows.filter((e) => !e.isCurrentUser);

  return (
    <section aria-label="Classement entre amis">
      <div className={styles.sectionHeading}>
        <h2 className="section-head">Tes amis</h2>
        <span>
          {others.length === 0
            ? "personne pour l'instant"
            : `${String(others.length)} ami${others.length > 1 ? "s" : ""}`}
        </span>
      </div>

      {board.rows.length === 0 ? (
        <p style={{ ...DISPLAY, fontSize: 14, color: "#8B88A8", margin: "0 0 20px" }}>
          Rien à classer pour l&apos;instant : ce tableau réunit les amis qui ont choisi d&apos;y
          figurer.
        </p>
      ) : (
        <ol className={styles.players}>
          {board.rows.map((entry) => (
            // No friend mark here: every row but the reader's would carry one.
            <PlayerCard key={entry.rank} entry={entry} markFriends={false} />
          ))}
        </ol>
      )}

      {period !== "all" && others.length > 0 ? (
        <p style={{ ...MONO, fontSize: 11, color: "var(--color-text-muted)", margin: "14px 0 0" }}>
          Un ami sans XP sur la période reste au tableau, à 0.
        </p>
      ) : null}

      <FriendsBoardSwitch listed={board.listedForFriends} />
    </section>
  );
}

/**
 * The reader's own "Visible par mes amis", where it matters.
 *
 * The friends board is opt-in and off by default, so for most readers this
 * tab starts empty - and the setting that fills it lived three clicks away,
 * in the privacy settings. The switch writes the same setting
 * (setFriendsLeaderboardAction, next to the privacy form's own action), and
 * the page comes back with the new state once it is saved.
 */
function FriendsBoardSwitch({ listed }: { listed: boolean }): React.JSX.Element {
  const [pending, startTransition] = useTransition();
  // Flipped at once, settled by the page's answer: the action revalidates
  // /leaderboard, so `listed` arrives with the saved value and this follows.
  const [shown, setShown] = useOptimistic(listed);

  const toggle = (): void => {
    const next = !shown;
    startTransition(async () => {
      setShown(next);
      const fd = new FormData();
      fd.set("friendsLeaderboard", String(next));
      try {
        const res = await setFriendsLeaderboardAction({}, fd);
        if (res.error !== undefined) toast.error(res.error);
      } catch {
        toast.error("Enregistrement impossible pour l'instant. Réessaie dans un moment.");
      }
    });
  };

  return (
    <div className={styles.friendsSwitch}>
      <p>
        {shown
          ? "Tes amis te voient dans leur propre classement."
          : "Tu n'apparais pas dans le classement de tes amis : ce tableau est le tien, eux ne t'y voient pas."}
      </p>
      <label className={styles.friendsSwitchLabel}>
        <Switch
          on={shown}
          disabled={pending}
          label="Apparaître dans le classement de mes amis"
          onClick={toggle}
        />
        <span aria-hidden="true">Visible par mes amis</span>
      </label>
    </div>
  );
}

interface Props {
  /** The tab in the address, which the page opens on. */
  board: LeaderboardView;
  period: LeaderboardPeriod;
  /** When the period opened, epoch ms; null for all time. */
  periodStart: number | null;
  /** The public board of the period, at most BOARD_ROWS rows. */
  rows: BoardRow[];
  /** Everybody the public board ranks. */
  total: number;
  standing: BoardStanding | null;
  season: { index: number; startsAt: number; endsAt: number } | null;
  membership: { division: LeagueDivisionCode; pod: number; seasonXp: number } | null;
  podLadder: PodLadderEntry[];
  podMemberCount: number;
  friendsBoard: FriendsBoardView;
}

const VIEWS: readonly { key: LeaderboardView; label: string }[] = [
  { key: "global", label: "Global" },
  { key: "friends", label: "Amis" },
  { key: "league", label: "Ligue" },
];

const PERIOD_PILLS = LEADERBOARD_PERIODS.map((key) => ({
  key,
  label: LEADERBOARD_PERIOD_LABEL[key],
}));

/** The second half of the title: "Classement global.", "… de la semaine." */
function titleTail(view: LeaderboardView, period: LeaderboardPeriod): string {
  if (view === "league") return "de la ligue.";
  if (view === "friends") return "entre amis.";
  if (period === "week") return "de la semaine.";
  if (period === "month") return "du mois.";
  return "global.";
}

export function LeaderboardClient({
  board,
  period,
  periodStart,
  rows,
  total,
  standing,
  season,
  membership,
  podLadder,
  podMemberCount,
  friendsBoard,
}: Props): React.JSX.Element {
  const router = useRouter();
  // The tab switches in place: every tab's data is already on the page. The
  // address follows without a request, so a period change - which does go
  // back to the server - comes back on the same tab.
  const [filter, setFilter] = useState<LeaderboardView>(board);
  const [, startTransition] = useTransition();
  // The pill pressed shows at once; the server's board replaces it on arrival.
  const [shownPeriod, setShownPeriod] = useOptimistic(period);

  const chooseView = (next: LeaderboardView): void => {
    setFilter(next);
    window.history.replaceState(window.history.state, "", leaderboardHref(next, period));
  };
  const choosePeriod = (next: LeaderboardPeriod): void => {
    if (next === shownPeriod) return;
    startTransition(() => {
      setShownPeriod(next);
      router.replace(leaderboardHref(filter, next), { scroll: false });
    });
  };

  // Podium order: silver (rank 2), gold (rank 1), bronze (rank 3)
  const podiumOrder = [2, 1, 3].flatMap((rank) => rows.filter((e) => e.rank === rank));

  const top12 = rows.filter((e) => e.rank <= 12);
  // Rows around the current user (2 above, me, 2 below)
  const nearMeIdx = rows.findIndex((e) => e.isCurrentUser);
  const contextRows =
    nearMeIdx >= 0
      ? rows.slice(Math.max(12, nearMeIdx - 2), Math.min(rows.length, nearMeIdx + 3))
      : [];

  // The count of the board in view: the public one's real total, the friends
  // listed, or the pod.
  const shownCount =
    filter === "friends" ? friendsBoard.rows.length : filter === "league" ? podMemberCount : total;
  const since =
    filter === "league" || periodStart === null
      ? null
      : leaderboardPeriodSince(period, new Date(periodStart));

  return (
    <>
      <div className="page-container learning-catalogue learning-workspace progression-workspace leaderboard-workspace">
        <ProgressionHeading
          eyebrow={
            season
              ? `Progression / Saison ${String(season.index).padStart(2, "0")}`
              : "Progression / Hors saison"
          }
          title="Classement"
          description={`Tes points dans le classement ${titleTail(filter, shownPeriod)}`}
        />
        <div className="leaderboard-view-tabs">
          <Tabs label="Classement" items={VIEWS} value={filter} onChange={chooseView} />
        </div>

        {/* The period: the public board and the friends board both have one;
            a league season is its own period already. */}
        {filter !== "league" ? (
          <div className={styles.periods}>
            <Pills
              label="Période"
              items={PERIOD_PILLS}
              value={shownPeriod}
              onChange={choosePeriod}
            />
          </div>
        ) : null}

        {/* Meta strip */}
        <div
          className="leaderboard-meta"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 16,
            ...MONO,
            fontSize: 11,
            color: "var(--color-text-muted)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            margin: "18px 0 48px",
            paddingBottom: 18,
            borderBottom: "1px dashed var(--color-border-default)",
          }}
        >
          {/* Only what is true of this board. "Session sécurisée", "FR · Europe"
              and "maj temps réel" were decoration dressed as information. */}
          <span>
            <b style={{ color: "var(--color-text-secondary)" }}>{formatNumberFr(shownCount)}</b>{" "}
            {shownCount === 1 ? "joueur classé" : "joueurs classés"}
          </span>
          {since !== null ? (
            <>
              <span style={{ color: "var(--color-text-faint)" }}>/</span>
              <span>{since}</span>
            </>
          ) : null}
          {season ? (
            <>
              <span style={{ color: "var(--color-text-faint)" }}>/</span>
              <span>
                Fin de saison ·{" "}
                <b style={{ color: "var(--color-text-secondary)" }}>
                  {SEASON_END.format(new Date(season.endsAt))}
                </b>
              </span>
            </>
          ) : null}
        </div>

        {filter === "league" ? (
          <LeagueClient
            season={season}
            membership={membership}
            podLadder={podLadder}
            podMemberCount={podMemberCount}
          />
        ) : filter === "friends" ? (
          <FriendsSection board={friendsBoard} period={period} />
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
            <YouBanner standing={standing} totalPlayers={total} period={period} />

            <section aria-label="Classement des joueurs">
              <div className={styles.sectionHeading}>
                <h2 className="section-head">Les joueurs</h2>
                <span>Top {Math.min(12, rows.length)}</span>
              </div>
              {top12.length === 0 ? (
                <p>
                  {period === "all"
                    ? "Aucun joueur dans le classement pour le moment."
                    : "Personne n'a encore gagné d'XP sur cette période."}
                </p>
              ) : (
                <ol className={styles.players}>
                  {top12.map((entry) => (
                    <PlayerCard key={entry.rank} entry={entry} />
                  ))}
                </ol>
              )}
              {contextRows.length > 0 ? (
                <>
                  <h2 className="section-head">Autour de toi</h2>
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
