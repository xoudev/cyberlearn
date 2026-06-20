/**
 * League pod ladder - integration test against the real Supabase DB.
 *
 * Seeds one ACTIVE season (end date in the future, so the rollover never fires)
 * with three members in the SAME division + pod - PUBLIC / ANONYMOUS / HIDDEN -
 * then exercises leagueRepository.getPodLadder end-to-end (real Prisma query +
 * pure anonymization transform). Skips gracefully if DATABASE_URL is unset.
 *
 * NOTE: briefly inserts a fake season + users into the live DB; rows are removed
 * in afterAll, and beforeAll nukes any leftovers from an interrupted run (test
 * users by their dedicated email domain, test seasons by the high index band).
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { leagueRepository } from "../repositories/league.repository.js";

const TEST_EMAIL_DOMAIN = "@test-league.cyberlearn.internal";
// Unique high index band no real season reaches (seasons increment from 1), well
// under INT4 max (~2.147e9). Keeps test seasons identifiable for cleanup.
const SEASON_INDEX_BASE = 1_900_000_000;

const suffix = randomUUID().slice(0, 8);
const seasonId = randomUUID();
const seasonIndex = SEASON_INDEX_BASE + (Number.parseInt(suffix, 16) % 100_000);

const pub = {
  id: randomUUID(),
  email: `lg-pub-${suffix}${TEST_EMAIL_DOMAIN}`,
  displayName: "LG Public",
  username: `lgpub${suffix}`,
  seasonXp: 300,
};
const anon = {
  id: randomUUID(),
  email: `lg-anon-${suffix}${TEST_EMAIL_DOMAIN}`,
  displayName: "LG Anon",
  username: `lganon${suffix}`,
  seasonXp: 200,
};
const hid = {
  id: randomUUID(),
  email: `lg-hid-${suffix}${TEST_EMAIL_DOMAIN}`,
  displayName: "LG Hidden",
  username: `lghid${suffix}`,
  seasonXp: 250, // between the others, so it ranks 2nd - proves it is NOT dropped
};
const ALL_IDS = [pub.id, anon.id, hid.id];

let configured = false;

async function seedMember(
  member: { id: string; email: string; displayName: string; username: string; seasonXp: number },
  visibility: "PUBLIC" | "ANONYMOUS" | "HIDDEN",
): Promise<void> {
  await prisma.user.create({
    data: {
      id: member.id,
      email: member.email,
      displayName: member.displayName,
      username: member.username,
      avatarUrl: "/avatars/av-1.svg",
      level: 12,
      preferences: { create: { leaderboardVisibility: visibility, publicProfile: true } },
    },
  });
  await prisma.leagueMembership.create({
    data: { userId: member.id, seasonId, division: "OR", pod: 1, seasonXp: member.seasonXp },
  });
}

describe("leagueRepository.getPodLadder (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;

    // Remove leftovers from a previously interrupted run.
    await prisma.user.deleteMany({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } });
    await prisma.season.deleteMany({ where: { index: { gte: SEASON_INDEX_BASE } } });

    await prisma.season.create({
      data: {
        id: seasonId,
        index: seasonIndex,
        startsAt: new Date(Date.now() - 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // future -> no rollover
        status: "ACTIVE",
      },
    });
    await seedMember(pub, "PUBLIC");
    await seedMember(hid, "HIDDEN");
    await seedMember(anon, "ANONYMOUS");

    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.user.deleteMany({ where: { id: { in: ALL_IDS } } }); // cascades memberships
    await prisma.season.deleteMany({ where: { id: seasonId } });
  });

  it("keeps all members (HIDDEN not dropped), ranks by seasonXp, and anonymizes per visibility", async () => {
    if (!configured) return;
    const ladder = await leagueRepository.getPodLadder(seasonId, "OR", 1, pub.id);

    // All three present and continuously ranked by seasonXp desc.
    expect(ladder).toHaveLength(3);
    expect(ladder.map((e) => e.rank)).toEqual([1, 2, 3]);
    expect(ladder.map((e) => e.seasonXp)).toEqual([300, 250, 200]);

    const pubEntry = ladder.find((e) => e.seasonXp === 300);
    const hidEntry = ladder.find((e) => e.seasonXp === 250);
    const anonEntry = ladder.find((e) => e.seasonXp === 200);

    // PUBLIC member (also the current user) keeps full identity.
    expect(pubEntry?.isCurrentUser).toBe(true);
    expect(pubEntry?.displayName).toBe(pub.displayName);
    expect(pubEntry?.username).toBe(pub.username);
    expect(pubEntry?.hasPublicProfile).toBe(true);

    // HIDDEN member is PRESENT (rank 2) but fully anonymized - the inverse of
    // the leaderboard, which would drop it.
    expect(hidEntry?.rank).toBe(2);
    expect(hidEntry?.isCurrentUser).toBe(false);
    expect(hidEntry?.displayName).toBeNull();
    expect(hidEntry?.username).toBeNull();
    expect(hidEntry?.avatarUrl).toBeNull();

    // ANONYMOUS member: ranked but stripped.
    expect(anonEntry?.displayName).toBeNull();
    expect(anonEntry?.username).toBeNull();

    // No seeded PII and no userId/id field anywhere in the payload.
    const serialized = JSON.stringify(ladder);
    expect(serialized).not.toContain(hid.username);
    expect(serialized).not.toContain(anon.username);
    expect(serialized).not.toContain(hid.displayName);
    for (const entry of ladder) {
      expect(Object.keys(entry)).not.toContain("userId");
      expect(Object.keys(entry)).not.toContain("id");
    }
  });

  it("reveals the current user's own identity even when ANONYMOUS", async () => {
    if (!configured) return;
    const ladder = await leagueRepository.getPodLadder(seasonId, "OR", 1, anon.id);
    const me = ladder.find((e) => e.isCurrentUser);
    expect(me?.seasonXp).toBe(200);
    expect(me?.displayName).toBe(anon.displayName);
    expect(me?.username).toBe(anon.username);
  });
});
