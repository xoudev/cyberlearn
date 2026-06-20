import React from "react";
import type { Metadata } from "next";
import { requireRequestUser } from "@/lib/auth";
import { leaderboardRepository, leagueRepository, type PodLadderEntry } from "@cyberlearn/db";
import type { LeagueDivisionCode } from "@cyberlearn/lib";
import { rolloverDueSeasons } from "@/lib/league/rollover";
import { ClassementClient } from "./_components/ClassementClient";

export const metadata: Metadata = { title: "Classement · CyberLearn" };
export const dynamic = "force-dynamic";

export default async function ClassementPage(): Promise<React.ReactElement> {
  const authUser = await requireRequestUser();

  // Lazy fallback for the weekly season rollover (the cron is the primary
  // driver). Idempotent + concurrency-safe; must never block the page render.
  try {
    await rolloverDueSeasons(new Date());
  } catch (error) {
    console.error("[classement] lazy season rollover failed:", error);
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
    <ClassementClient
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
