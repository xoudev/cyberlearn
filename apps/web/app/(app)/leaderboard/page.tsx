import React from "react";
import type { Metadata } from "next";
import { requireRequestUser } from "@/lib/auth";
import { leaderboardRepository, leagueRepository, type PodLadderEntry } from "@cyberlearn/db";
import type { LeagueDivisionCode } from "@cyberlearn/lib";
import { rolloverDueSeasons } from "@/lib/league/rollover";
import { LeaderboardClient } from "./_components/LeaderboardClient";

export const metadata: Metadata = { title: "Classement · CyberLearn" };
export const dynamic = "force-dynamic";
// The lazy fallback below runs the same transaction as the cron, which is
// allowed 60s. Without a matching budget the render would be killed mid-flight,
// rolling the claim back so the next visitor retries - and times out too.
export const maxDuration = 60;

/**
 * How long after a season ends the cron gets to do its job before a page view
 * takes over. The rollover walks every member of the season, so making a
 * visitor pay for it on the normal path is pure latency; this keeps the
 * fallback for what it is meant to cover - a cron that did not run at all.
 */
const LAZY_ROLLOVER_GRACE_MS = 15 * 60 * 1000;

export default async function LeaderboardPage(): Promise<React.ReactElement> {
  const authUser = await requireRequestUser();

  // Lazy fallback for the weekly season rollover (the cron is the primary
  // driver). Idempotent + concurrency-safe; must never block the page render.
  try {
    await rolloverDueSeasons(new Date(Date.now() - LAZY_ROLLOVER_GRACE_MS));
  } catch (error) {
    console.error("[leaderboard] lazy season rollover failed:", error);
  }

  const [entries, userRank, season] = await Promise.all([
    leaderboardRepository.findTopUsers(100, authUser.id),
    leaderboardRepository.findUserRank(authUser.id),
    leagueRepository.getActiveSeason(),
  ]);
  const currentEntry = entries.find((e) => e.isCurrentUser) ?? null;

  // League: shown only when a season is ACTIVE and the user has joined it (i.e.
  // earned XP this season). All PII stripping happens server-side in getPodLadder.
  let membership: { division: LeagueDivisionCode; pod: number; seasonXp: number } | null = null;
  let podLadder: PodLadderEntry[] = [];
  if (season) {
    const m = await leagueRepository.getUserMembership(authUser.id, season.id);
    if (m) {
      membership = { division: m.division, pod: m.pod, seasonXp: m.seasonXp };
      podLadder = await leagueRepository.getPodLadder(season.id, m.division, m.pod, authUser.id);
    }
  }

  // Dates cross the RSC boundary as epoch ms (Date objects don't survive intact).
  const seasonProp = season
    ? { index: season.index, startsAt: season.startsAt.getTime(), endsAt: season.endsAt.getTime() }
    : null;

  return (
    <LeaderboardClient
      entries={entries}
      userRank={userRank}
      currentEntry={currentEntry}
      season={seasonProp}
      membership={membership}
      podLadder={podLadder}
      podMemberCount={podLadder.length}
    />
  );
}
