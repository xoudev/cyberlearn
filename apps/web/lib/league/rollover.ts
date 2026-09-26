import type { LeagueDivision } from "@cyberlearn/db";
import { prisma } from "@cyberlearn/db";
import { divisionDown, divisionUp, POD_SIZE, podOutcome } from "@cyberlearn/lib";

const SEASON_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
// Generous cap: the rollover touches every member of the season in one tx.
const ROLLOVER_TIMEOUT_MS = 60_000;

export interface RolloverResult {
  finalized: boolean;
  seasonIndex?: number;
  members?: number;
  promoted?: number;
  relegated?: number;
  nextSeasonIndex?: number;
}

/**
 * Closes a season and opens the next one. Idempotent and concurrency-safe: the
 * whole thing runs in one transaction whose first step is an atomic
 * ACTIVE -> CLOSING claim (a row-locked conditional update). Only the first
 * caller (cron or the lazy fallback) wins the claim and does the work; everyone
 * else sees 0 rows and returns finalized:false. A crash rolls the whole tx back
 * - including the claim - so the season stays ACTIVE and a later run retries it.
 *
 * Per pod, members are ranked by seasonXp: the top `promote` advance a division,
 * the bottom `relegate` drop one (zones shrink for small pods, see podOutcome).
 * Returning players are pre-seated into the next season with their carried-over
 * division (seasonXp reset to 0), so the ladder is fixed when the season opens.
 */
async function finalizeSeason(seasonId: string, now: Date): Promise<RolloverResult> {
  return prisma.$transaction(
    async (tx): Promise<RolloverResult> => {
      const claimed = await tx.season.updateMany({
        where: { id: seasonId, status: "ACTIVE", endsAt: { lte: now } },
        data: { status: "CLOSING" },
      });
      if (claimed.count === 0) return { finalized: false };

      const season = await tx.season.findUniqueOrThrow({
        where: { id: seasonId },
        select: { index: true, endsAt: true },
      });
      const members = await tx.leagueMembership.findMany({
        where: { seasonId },
        select: {
          id: true,
          userId: true,
          division: true,
          pod: true,
          seasonXp: true,
          joinedAt: true,
        },
        orderBy: [{ division: "asc" }, { pod: "asc" }, { seasonXp: "desc" }, { joinedAt: "asc" }],
      });

      // Global season rank by seasonXp across ALL pods (same tiebreak as a pod),
      // distinct from the pod-local finalRank below.
      const globalRankById = new Map<string, number>();
      [...members]
        .sort((a, b) => b.seasonXp - a.seasonXp || a.joinedAt.getTime() - b.joinedAt.getTime())
        .forEach((m, idx) => {
          globalRankById.set(m.id, idx + 1);
        });

      // Rank each pod, decide promotion/relegation, compute the next division.
      const standings: {
        id: string;
        finalRank: number;
        promoted: boolean;
        relegated: boolean;
        globalRank: number;
      }[] = [];
      const placements: { userId: string; division: LeagueDivision }[] = [];
      let promotedTotal = 0;
      let relegatedTotal = 0;

      let i = 0;
      while (i < members.length) {
        const head = members[i];
        if (!head) break;
        let j = i;
        while (
          j < members.length &&
          members[j]?.division === head.division &&
          members[j]?.pod === head.pod
        ) {
          j++;
        }
        const pod = members.slice(i, j);
        const n = pod.length;
        const { promote, relegate } = podOutcome(n);
        pod.forEach((m, idx) => {
          const rank = idx + 1;
          const promoted = rank <= promote;
          const relegated = rank > n - relegate;
          const nextDivision = promoted
            ? (divisionUp(m.division) ?? m.division)
            : relegated
              ? (divisionDown(m.division) ?? m.division)
              : m.division;
          standings.push({
            id: m.id,
            finalRank: rank,
            promoted,
            relegated,
            globalRank: globalRankById.get(m.id) ?? rank,
          });
          placements.push({ userId: m.userId, division: nextDivision });
          if (promoted) promotedTotal++;
          if (relegated) relegatedTotal++;
        });
        i = j;
      }

      // Persist final standings on the closing season.
      for (const s of standings) {
        await tx.leagueMembership.update({
          where: { id: s.id },
          data: {
            finalRank: s.finalRank,
            promoted: s.promoted,
            relegated: s.relegated,
            globalRank: s.globalRank,
          },
        });
      }

      // Open the next season.
      const nextIndex = season.index + 1;
      const startsAt = season.endsAt;
      const endsAt = new Date(startsAt.getTime() + SEASON_DAYS * DAY_MS);
      const next = await tx.season.create({
        data: { index: nextIndex, startsAt, endsAt, status: "ACTIVE" },
      });

      // Pre-seat returning players: group by next division, chunk into pods.
      const byDivision = new Map<LeagueDivision, string[]>();
      for (const p of placements) {
        const arr = byDivision.get(p.division) ?? [];
        arr.push(p.userId);
        byDivision.set(p.division, arr);
      }
      const nextMemberships: {
        userId: string;
        seasonId: string;
        division: LeagueDivision;
        pod: number;
      }[] = [];
      for (const [division, userIds] of byDivision) {
        userIds.forEach((userId, idx) => {
          nextMemberships.push({
            userId,
            seasonId: next.id,
            division,
            pod: Math.floor(idx / POD_SIZE) + 1,
          });
        });
      }
      if (nextMemberships.length > 0) {
        await tx.leagueMembership.createMany({ data: nextMemberships });
      }

      // Close the season.
      await tx.season.update({ where: { id: seasonId }, data: { status: "CLOSED" } });

      return {
        finalized: true,
        seasonIndex: season.index,
        members: members.length,
        promoted: promotedTotal,
        relegated: relegatedTotal,
        nextSeasonIndex: nextIndex,
      };
    },
    { timeout: ROLLOVER_TIMEOUT_MS },
  );
}

/** Finalizes every ACTIVE season past its end (used by the cron + lazy fallback). */
export async function rolloverDueSeasons(now: Date): Promise<RolloverResult[]> {
  const due = await prisma.season.findMany({
    where: { status: "ACTIVE", endsAt: { lte: now } },
    select: { id: true },
  });
  const results: RolloverResult[] = [];
  for (const s of due) {
    results.push(await finalizeSeason(s.id, now));
  }
  return results;
}
