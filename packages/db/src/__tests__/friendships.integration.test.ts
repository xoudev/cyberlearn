/**
 * Two people, and every way one row between them can go wrong.
 *
 * The pair has no natural order and a row does, which is the whole difficulty.
 * The ids are stored smallest first and the unique constraint sits on that
 * ordered pair, so most of these tests are about one question: does asking in
 * either direction, at any moment, still produce exactly one friendship?
 *
 * The last block asks the other one. A friendship is not only a row - it opens
 * a private profile - so it checks what an unanswered request opens, which is
 * nothing.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { friendshipRepository } from "../repositories/friendship.repository.js";
import { userRepository } from "../repositories/user.repository.js";

const suffix = randomUUID().slice(0, 8);
const alice = randomUUID();
const bob = randomUUID();
const carol = randomUUID();
const USER_IDS = [alice, bob, carol];

/** Carol keeps her profile closed; Alice leaves hers open. */
const carolHandle = `fc${suffix}`;
const aliceHandle = `fa${suffix}`;

let configured = false;

describe("friendships (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;
    await prisma.user.createMany({
      data: [
        { id: alice, email: `fa-${suffix}@t.internal`, username: `fa${suffix}`, displayName: "A" },
        { id: bob, email: `fb-${suffix}@t.internal`, username: `fb${suffix}`, displayName: "B" },
        { id: carol, email: `fc-${suffix}@t.internal`, username: `fc${suffix}`, displayName: "C" },
      ],
    });
    await prisma.userPreferences.create({ data: { userId: carol, publicProfile: false } });
    configured = true;
  });

  afterEach(async () => {
    if (!configured) return;
    await prisma.friendship.deleteMany({
      where: { OR: [{ userAId: { in: USER_IDS } }, { userBId: { in: USER_IDS } }] },
    });
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.userPreferences.deleteMany({ where: { userId: { in: USER_IDS } } });
    await prisma.user.deleteMany({ where: { id: { in: USER_IDS } } });
  });

  it("records one request, findable from either side", async () => {
    if (!configured) return;
    expect(await friendshipRepository.request(alice, bob)).toEqual({ ok: true, status: "PENDING" });

    // The order the question is asked in must not change the answer.
    expect((await friendshipRepository.between(alice, bob))?.status).toBe("PENDING");
    expect((await friendshipRepository.between(bob, alice))?.status).toBe("PENDING");
  });

  it("refuses to pair somebody with themselves", async () => {
    if (!configured) return;
    expect(await friendshipRepository.request(alice, alice)).toEqual({ ok: false, reason: "SELF" });
    expect(await prisma.friendship.count({ where: { userAId: alice } })).toBe(0);
  });

  it("keeps one row when the same person asks twice", async () => {
    if (!configured) return;
    await friendshipRepository.request(alice, bob);
    expect(await friendshipRepository.request(alice, bob)).toEqual({
      ok: false,
      reason: "ALREADY",
    });
    expect(await prisma.friendship.count()).toBeGreaterThan(0);
    expect(
      await prisma.friendship.count({
        where: { OR: [{ userAId: alice }, { userBId: alice }] },
      }),
    ).toBe(1);
  });

  it("treats asking somebody who already asked you as agreeing", async () => {
    if (!configured) return;
    await friendshipRepository.request(alice, bob);

    // Bob opens Alice's profile, sees the button, presses it. He means yes.
    expect(await friendshipRepository.request(bob, alice)).toEqual({
      ok: true,
      status: "ACCEPTED",
    });
    expect((await friendshipRepository.between(alice, bob))?.status).toBe("ACCEPTED");
  });

  it("survives both of them asking at the same instant", async () => {
    if (!configured) return;
    // The case the ordered pair exists for: two people on each other's profile
    // at once. One insert wins, the other hits the constraint - and the answer
    // to both is still yes.
    const [first, second] = await Promise.all([
      friendshipRepository.request(alice, bob),
      friendshipRepository.request(bob, alice),
    ]);

    expect([first.ok, second.ok]).toContain(true);
    expect(
      await prisma.friendship.count({
        where: { OR: [{ userAId: alice }, { userBId: alice }] },
      }),
    ).toBe(1);
  });

  it("lets only the person who was asked accept", async () => {
    if (!configured) return;
    await friendshipRepository.request(alice, bob);

    // Alice cannot accept her own request by calling accept the other way round.
    expect(await friendshipRepository.accept(alice, bob)).toBe(false);
    expect((await friendshipRepository.between(alice, bob))?.status).toBe("PENDING");

    expect(await friendshipRepository.accept(bob, alice)).toBe(true);
    expect((await friendshipRepository.between(alice, bob))?.status).toBe("ACCEPTED");
  });

  it("does not accept twice", async () => {
    if (!configured) return;
    await friendshipRepository.request(alice, bob);
    await friendshipRepository.accept(bob, alice);

    expect(await friendshipRepository.accept(bob, alice)).toBe(false);
  });

  it("lets a declined request be made again later", async () => {
    if (!configured) return;
    await friendshipRepository.request(alice, bob);
    expect(await friendshipRepository.remove(bob, alice)).toBe(true);

    // Deleted rather than kept as a tombstone: somebody who said no in March
    // must be able to say yes in June.
    expect(await friendshipRepository.between(alice, bob)).toBeNull();
    expect(await friendshipRepository.request(alice, bob)).toEqual({
      ok: true,
      status: "PENDING",
    });
  });

  it("lets either side end a friendship, and nobody else", async () => {
    if (!configured) return;
    await friendshipRepository.request(alice, bob);
    await friendshipRepository.accept(bob, alice);

    // Carol is not in this friendship and cannot touch it.
    expect(await friendshipRepository.remove(carol, alice)).toBe(false);
    expect((await friendshipRepository.between(alice, bob))?.status).toBe("ACCEPTED");

    expect(await friendshipRepository.remove(alice, bob)).toBe(true);
    expect(await friendshipRepository.between(alice, bob)).toBeNull();
  });

  it("lists each side under the right heading", async () => {
    if (!configured) return;
    await friendshipRepository.request(alice, bob); // alice asked bob
    await friendshipRepository.request(carol, alice); // carol asked alice

    const outgoing = await friendshipRepository.listOutgoing(alice);
    const incoming = await friendshipRepository.listIncoming(alice);

    expect(outgoing.map((e) => e.person.id)).toEqual([bob]);
    expect(incoming.map((e) => e.person.id)).toEqual([carol]);
    // Waiting on an answer is not being friends.
    expect(await friendshipRepository.listFriends(alice)).toHaveLength(0);
    expect(await friendshipRepository.countIncoming(alice)).toBe(1);
  });

  it("always names the other person, from either seat", async () => {
    if (!configured) return;
    await friendshipRepository.request(alice, bob);
    await friendshipRepository.accept(bob, alice);

    const forAlice = await friendshipRepository.listFriends(alice);
    const forBob = await friendshipRepository.listFriends(bob);

    // A friends list that shows you yourself is the bug this turns round.
    expect(forAlice.map((e) => e.person.id)).toEqual([bob]);
    expect(forBob.map((e) => e.person.id)).toEqual([alice]);
  });

  it("refuses an out-of-order pair at the database, not just in the repository", async () => {
    if (!configured) return;
    // The ordering is what makes "one friendship per pair" a constraint rather
    // than a convention, so the table enforces it. Written straight past the
    // repository on purpose: this is the line that holds if somebody ever
    // inserts a friendship by hand or from a script.
    const [low, high] = alice < bob ? [alice, bob] : [bob, alice];

    await expect(
      prisma.friendship.create({
        data: { userAId: high, userBId: low, requestedById: high },
      }),
    ).rejects.toThrow();

    // And nobody is their own friend.
    await expect(
      prisma.friendship.create({
        data: { userAId: alice, userBId: alice, requestedById: alice },
      }),
    ).rejects.toThrow();

    // Nor can a third party be recorded as the requester of somebody else's.
    await expect(
      prisma.friendship.create({
        data: { userAId: low, userBId: high, requestedById: carol },
      }),
    ).rejects.toThrow();
  });

  it("goes when one of the two accounts does", async () => {
    if (!configured) return;
    const temp = randomUUID();
    await prisma.user.create({
      data: {
        id: temp,
        email: `ft-${temp.slice(0, 8)}@t.internal`,
        username: `ft${temp.slice(0, 8)}`,
        displayName: "T",
      },
    });
    await friendshipRepository.request(alice, temp);

    await prisma.user.delete({ where: { id: temp } });

    // A friendship with a deleted account is a row pointing at nobody.
    expect(await friendshipRepository.listOutgoing(alice)).toHaveLength(0);
  });

  // ─── What a friendship opens ─────────────────────────────────────────────
  //
  // Carol's profile is private. "Private" here means what it means everywhere
  // else - the people she accepted, and nobody else - so these tests are as
  // much about what stays shut as about what opens.

  it("keeps a private profile shut to a stranger, signed in or not", async () => {
    if (!configured) return;
    expect(await userRepository.findPublicProfile(carolHandle, bob)).toBeNull();
    expect(await userRepository.findPublicProfile(carolHandle)).toBeNull();
  });

  it("keeps a private profile shut to somebody who has only asked", async () => {
    if (!configured) return;
    await friendshipRepository.request(bob, carol);
    expect(await userRepository.findPublicProfile(carolHandle, bob)).toBeNull();

    // Including when it is Carol who asked and Bob who has not answered: the
    // request is hers, the profile is hers, and neither makes him a friend.
    await friendshipRepository.remove(bob, carol);
    await friendshipRepository.request(carol, bob);
    expect(await userRepository.findPublicProfile(carolHandle, bob)).toBeNull();
  });

  it("opens a private profile to an accepted friend", async () => {
    if (!configured) return;
    await friendshipRepository.request(bob, carol);
    await friendshipRepository.accept(carol, bob);

    expect(await userRepository.findPublicProfile(carolHandle, bob)).not.toBeNull();
    // And shuts again when the friendship ends.
    await friendshipRepository.remove(bob, carol);
    expect(await userRepository.findPublicProfile(carolHandle, bob)).toBeNull();
  });

  it("opens a private profile to its owner, and leaves a public one open", async () => {
    if (!configured) return;
    expect(await userRepository.findPublicProfile(carolHandle, carol)).not.toBeNull();
    expect(await userRepository.findPublicProfile(aliceHandle, bob)).not.toBeNull();
    expect(await userRepository.findPublicProfile(aliceHandle)).not.toBeNull();
  });
});
