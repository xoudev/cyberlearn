/**
 * Leaderboard visibility - integration test against the real Supabase DB.
 *
 * Seeds three users (PUBLIC / ANONYMOUS / HIDDEN) with astronomically high XP
 * (far above any real user, within INT4 range) so they deterministically take
 * the top ranks, then exercises leaderboardRepository end-to-end (real Prisma
 * query + pure anonymization transform). Skips gracefully if DATABASE_URL is
 * not configured.
 *
 * NOTE: this briefly inserts fake top-ranked users into the live DB while the
 * test runs; rows are removed in afterAll, and beforeAll nukes any leftover
 * test rows (xpTotal >= the marker) from an interrupted run.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { leaderboardRepository } from "../repositories/leaderboard.repository.js";

// Marker XP band no real user can reach (level 100 ≈ 1.5M); fits INT4 (max ~2.147e9).
const XP_MARKER = 2_000_000_000;
const XP_TEACH = 2_000_000_004; // highest of all - same trap as XP_HID, for the role filter
const XP_HID = 2_000_000_003;
const XP_PUB = 2_000_000_002;
const XP_ANON = 2_000_000_001;

// Ledger credits for the period board (rows cascade away with their users).
const PERIOD_START = new Date(Date.now() - 3_600_000);
const LEDGER_TEACH = 1_500_000_004;
const LEDGER_HID = 1_500_000_003;
const LEDGER_PUB = 1_500_000_002;
const LEDGER_ANON = 1_500_000_001;
const LEDGER_OLD = 500_000_000;

const suffix = randomUUID().slice(0, 8);
const pub = {
  id: randomUUID(),
  email: `lb-pub-${suffix}@test.cyberlearn.internal`,
  displayName: "LB Public",
  username: `lbpub${suffix}`,
};
const anon = {
  id: randomUUID(),
  email: `lb-anon-${suffix}@test.cyberlearn.internal`,
  displayName: "LB Anon",
  username: `lbanon${suffix}`,
};
const hid = {
  id: randomUUID(),
  email: `lb-hid-${suffix}@test.cyberlearn.internal`,
  displayName: "LB Hidden",
  username: `lbhid${suffix}`,
};
const teach = {
  id: randomUUID(),
  email: `lb-teach-${suffix}@test.cyberlearn.internal`,
  displayName: "LB Teacher",
  username: `lbteach${suffix}`,
};
const ALL_IDS = [pub.id, anon.id, hid.id, teach.id];

let configured = false;

describe("leaderboardRepository (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;

    // Remove any leftover marker users from a previously interrupted run.
    await prisma.user.deleteMany({ where: { xpTotal: { gte: XP_MARKER } } });

    await prisma.user.create({
      data: {
        id: pub.id,
        email: pub.email,
        displayName: pub.displayName,
        username: pub.username,
        avatarUrl: "/avatars/av-1.svg",
        xpTotal: XP_PUB,
        level: 99,
        streakDays: 1,
        preferences: { create: { leaderboardVisibility: "PUBLIC", publicProfile: true } },
      },
    });
    await prisma.user.create({
      data: {
        id: anon.id,
        email: anon.email,
        displayName: anon.displayName,
        username: anon.username,
        avatarUrl: "/avatars/av-2.svg",
        xpTotal: XP_ANON,
        level: 99,
        streakDays: 1,
        preferences: { create: { leaderboardVisibility: "ANONYMOUS", publicProfile: true } },
      },
    });
    await prisma.user.create({
      data: {
        id: hid.id,
        email: hid.email,
        displayName: hid.displayName,
        username: hid.username,
        avatarUrl: "/avatars/av-3.svg",
        xpTotal: XP_HID,
        level: 99,
        streakDays: 1,
        preferences: { create: { leaderboardVisibility: "HIDDEN", publicProfile: true } },
      },
    });

    // A teacher with more XP than anyone. PUBLIC visibility on purpose: only the
    // role should keep them off the board, so nothing else can be credited with
    // the exclusion.
    await prisma.user.create({
      data: {
        id: teach.id,
        email: teach.email,
        displayName: teach.displayName,
        username: teach.username,
        avatarUrl: "/avatars/av-4.svg",
        role: "TEACHER",
        xpTotal: XP_TEACH,
        level: 99,
        streakDays: 1,
        preferences: { create: { leaderboardVisibility: "PUBLIC", publicProfile: true } },
      },
    });

    // The period boards read the ledger. Amounts in their own band too, far
    // above what anybody earns in a week, and the same trap as above: the
    // HIDDEN user and the teacher earned the most. Anon also has an older
    // credit, before the window, which would put them first if it counted.
    const inWindow = new Date();
    const beforeWindow = new Date(PERIOD_START.getTime() - 86_400_000);
    await prisma.xpLedger.createMany({
      data: [
        { userId: pub.id, amount: LEDGER_PUB, source: "LESSON", createdAt: inWindow },
        { userId: anon.id, amount: LEDGER_ANON, source: "LESSON", createdAt: inWindow },
        { userId: anon.id, amount: LEDGER_OLD, source: "LESSON", createdAt: beforeWindow },
        { userId: hid.id, amount: LEDGER_HID, source: "LESSON", createdAt: inWindow },
        { userId: teach.id, amount: LEDGER_TEACH, source: "LESSON", createdAt: inWindow },
      ],
    });

    configured = true;
  });

  afterAll(async () => {
    if (!configured) return; // no DB configured (e.g. CI without DATABASE_URL) → nothing to clean
    await prisma.user.deleteMany({ where: { id: { in: ALL_IDS } } });
  });

  it("findTopUsers: PUBLIC keeps identity, ANONYMOUS is stripped, HIDDEN is absent, ranks are continuous", async () => {
    if (!configured) return;
    const entries = await leaderboardRepository.findTopUsers(100, pub.id);

    const pubEntry = entries.find((e) => e.xpTotal === XP_PUB);
    const anonEntry = entries.find((e) => e.xpTotal === XP_ANON);
    const hidEntry = entries.find((e) => e.xpTotal === XP_HID);

    // HIDDEN excluded entirely - not present in the payload at all.
    expect(hidEntry).toBeUndefined();

    // So is the teacher, despite PUBLIC visibility and the highest XP of all.
    expect(entries.find((e) => e.xpTotal === XP_TEACH)).toBeUndefined();

    // PUBLIC user (also the current user) keeps full identity at rank 1.
    // rank 1 proves the higher-XP HIDDEN user did not occupy a ghost rank.
    expect(pubEntry?.rank).toBe(1);
    expect(pubEntry?.isCurrentUser).toBe(true);
    expect(pubEntry?.displayName).toBe(pub.displayName);
    expect(pubEntry?.username).toBe(pub.username);
    expect(pubEntry?.hasPublicProfile).toBe(true);

    // ANONYMOUS other user: ranked (continuous, no gap) but fully stripped.
    expect(anonEntry?.rank).toBe(2);
    expect(anonEntry?.isCurrentUser).toBe(false);
    expect(anonEntry?.displayName).toBeNull();
    expect(anonEntry?.username).toBeNull();
    expect(anonEntry?.avatarUrl).toBeNull();

    // No userId field is serialized on any row.
    for (const e of entries) {
      expect(Object.keys(e)).not.toContain("userId");
    }
  });

  it("findCurrentUserPosition: PUBLIC user sees rank 1 + own identity", async () => {
    if (!configured) return;
    const pos = await leaderboardRepository.findCurrentUserPosition(pub.id);
    expect(pos?.visibility).toBe("PUBLIC");
    expect(pos?.rank).toBe(1);
    expect(pos?.displayName).toBe(pub.displayName);
  });

  it("findCurrentUserPosition: ANONYMOUS user sees their rank + their OWN identity (own data)", async () => {
    if (!configured) return;
    const pos = await leaderboardRepository.findCurrentUserPosition(anon.id);
    expect(pos?.visibility).toBe("ANONYMOUS");
    expect(pos?.rank).toBe(2); // HIDDEN (higher XP) is not counted → no gap
    expect(pos?.displayName).toBe(anon.displayName);
  });

  it("findCurrentUserPosition: HIDDEN user has no public rank (masqué)", async () => {
    if (!configured) return;
    const pos = await leaderboardRepository.findCurrentUserPosition(hid.id);
    expect(pos?.visibility).toBe("HIDDEN");
    expect(pos?.rank).toBeNull();
  });

  it("a teacher is not ranked: no board position, no dashboard rank", async () => {
    if (!configured) return;

    // Both answers have to agree with the list the teacher is absent from - a
    // rank among people one is not listed beside is a number about nothing.
    const pos = await leaderboardRepository.findCurrentUserPosition(teach.id);
    expect(pos?.rank).toBeNull();

    const rank = await leaderboardRepository.findUserRank(teach.id);
    expect(rank).toBe(0);
  });

  it("countRanked counts the same players as the board, beyond its first rows", async () => {
    if (!configured) return;
    const total = await leaderboardRepository.countRanked();
    const top = await leaderboardRepository.findTopUsers(1, pub.id);
    // At least PUBLIC and ANONYMOUS; never the HIDDEN user nor the teacher,
    // so it can exceed the one row asked for without counting either.
    expect(total).toBeGreaterThanOrEqual(2);
    expect(top).toHaveLength(1);
  });

  it("findTopUsersSince: the period's XP, the same visibility rules, the old credit left out", async () => {
    if (!configured) return;
    const board = await leaderboardRepository.findTopUsersSince(PERIOD_START, 100, pub.id);

    const pubEntry = board.entries.find((e) => e.xpTotal === LEDGER_PUB);
    const anonEntry = board.entries.find((e) => e.xpTotal === LEDGER_ANON);

    // HIDDEN and the teacher earned the most and are not there.
    expect(board.entries.find((e) => e.xpTotal === LEDGER_HID)).toBeUndefined();
    expect(board.entries.find((e) => e.xpTotal === LEDGER_TEACH)).toBeUndefined();

    // Anon's older credit did not count: PUBLIC is first, anon second.
    expect(pubEntry?.rank).toBe(1);
    expect(pubEntry?.isCurrentUser).toBe(true);
    expect(pubEntry?.username).toBe(pub.username);
    expect(anonEntry?.rank).toBe(2);
    expect(anonEntry?.username).toBeNull();
    expect(anonEntry?.displayName).toBeNull();

    expect(board.total).toBeGreaterThanOrEqual(2);
    expect(board.standing).toEqual({ rank: 1, xp: LEDGER_PUB });

    // The HIDDEN user has no place on it, whatever they earned.
    const hidden = await leaderboardRepository.findTopUsersSince(PERIOD_START, 100, hid.id);
    expect(hidden.standing).toBeNull();
  });
});
