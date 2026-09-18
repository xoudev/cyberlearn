/**
 * Who reaches a friends board, against the real DB.
 *
 * The board names everyone it lists, so the only thing standing between a
 * person and having their name on somebody else's screen is this query and the
 * switch behind it. That is worth checking against the server rather than
 * against an interface that only ever offers the right people.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { friendshipRepository } from "../repositories/friendship.repository.js";
import { leaderboardRepository } from "../repositories/leaderboard.repository.js";

const suffix = randomUUID().slice(0, 8);

// ME, plus one friend per case. XP is set so the expected order is unambiguous.
const ME = randomUUID();
const IN = randomUUID(); // friend, opted in
const OUT = randomUUID(); // friend, opted out
const ASKED = randomUUID(); // asked, never answered
const STRANGER = randomUUID(); // opted in, not a friend
const PROF = randomUUID(); // friend, opted in, teaches

const EVERYONE = [ME, IN, OUT, ASKED, STRANGER, PROF];
let configured = false;

async function optIn(userId: string, on: boolean): Promise<void> {
  await prisma.userPreferences.update({
    where: { userId },
    data: { friendsLeaderboard: on },
  });
}

describe("friends leaderboard (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;

    const people: [string, string, number, "STUDENT" | "TEACHER", boolean][] = [
      [ME, "Moi", 500, "STUDENT", false],
      [IN, "Ami visible", 900, "STUDENT", true],
      [OUT, "Ami discret", 800, "STUDENT", false],
      [ASKED, "Demandeur", 700, "STUDENT", true],
      [STRANGER, "Inconnu", 999, "STUDENT", true],
      [PROF, "Prof", 9999, "TEACHER", true],
    ];
    for (const [id, name, xp, role, friendsLeaderboard] of people) {
      await prisma.user.create({
        data: {
          id,
          email: `${id.slice(0, 8)}-${suffix}@t.internal`,
          username: `${id.slice(0, 6)}${suffix}`,
          displayName: name,
          xpTotal: xp,
          role,
          preferences: { create: { friendsLeaderboard } },
        },
      });
    }
    configured = true;
  });

  afterEach(async () => {
    if (!configured) return;
    await prisma.friendship.deleteMany({
      where: { OR: [{ userAId: { in: EVERYONE } }, { userBId: { in: EVERYONE } }] },
    });
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.friendship.deleteMany({
      where: { OR: [{ userAId: { in: EVERYONE } }, { userBId: { in: EVERYONE } }] },
    });
    await prisma.userPreferences.deleteMany({ where: { userId: { in: EVERYONE } } });
    await prisma.user.deleteMany({ where: { id: { in: EVERYONE } } });
  });

  async function befriend(other: string): Promise<void> {
    await friendshipRepository.request(ME, other);
    await friendshipRepository.accept(other, ME);
  }

  it("lists a friend who opted in, by name, above or below by XP", async () => {
    if (!configured) return;
    await befriend(IN);

    const { entries } = await leaderboardRepository.findFriendsBoard(ME);
    expect(entries.map((e) => e.displayName)).toEqual(["Ami visible", "Moi"]);
    expect(entries.map((e) => e.rank)).toEqual([1, 2]);
    expect(entries[0]?.isCurrentUser).toBe(false);
    expect(entries[1]?.isCurrentUser).toBe(true);
  });

  it("leaves out a friend who did not opt in", async () => {
    if (!configured) return;
    await befriend(OUT);

    const { entries } = await leaderboardRepository.findFriendsBoard(ME);
    expect(entries.map((e) => e.displayName)).toEqual(["Moi"]);
  });

  it("leaves out somebody who only asked, whichever way round", async () => {
    if (!configured) return;
    await friendshipRepository.request(ME, ASKED);
    expect((await leaderboardRepository.findFriendsBoard(ME)).entries).toHaveLength(1);

    await friendshipRepository.remove(ME, ASKED);
    await friendshipRepository.request(ASKED, ME);
    // Being asked is not being friends either: an unanswered request must not
    // put a stranger's name on anybody's screen.
    expect((await leaderboardRepository.findFriendsBoard(ME)).entries).toHaveLength(1);
  });

  it("leaves out a stranger who opted in", async () => {
    if (!configured) return;
    // The switch says "my friends may see me", not "anybody may".
    const { entries } = await leaderboardRepository.findFriendsBoard(ME);
    expect(entries.map((e) => e.displayName)).toEqual(["Moi"]);
  });

  it("leaves out a teacher, the same way the public board does", async () => {
    if (!configured) return;
    await befriend(PROF);

    const { entries } = await leaderboardRepository.findFriendsBoard(ME);
    expect(entries.map((e) => e.displayName)).toEqual(["Moi"]);
  });

  it("keeps the reader on their own board, and says they are on nobody else's", async () => {
    if (!configured) return;
    const before = await leaderboardRepository.findFriendsBoard(ME);
    expect(before.entries.map((e) => e.isCurrentUser)).toEqual([true]);
    expect(before.listedForFriends).toBe(false);

    await optIn(ME, true);
    const after = await leaderboardRepository.findFriendsBoard(ME);
    expect(after.listedForFriends).toBe(true);
    await optIn(ME, false);
  });

  it("stops listing somebody the moment they switch it off", async () => {
    if (!configured) return;
    await befriend(IN);
    expect((await leaderboardRepository.findFriendsBoard(ME)).entries).toHaveLength(2);

    await optIn(IN, false);
    expect((await leaderboardRepository.findFriendsBoard(ME)).entries).toHaveLength(1);
    await optIn(IN, true);
  });
});
