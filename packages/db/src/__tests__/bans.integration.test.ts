/**
 * Keeping somebody out, letting them back in, and the record of both.
 *
 * The rule for "banned right now" is one where-clause used by every read, and
 * the ways it can go wrong are all quiet: a lifted ban that keeps applying
 * locks somebody out of an account an administrator opened this morning, and an
 * expired one that keeps applying does the same on a timer. Neither throws.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { banRepository } from "../repositories/ban.repository.js";

const suffix = randomUUID().slice(0, 8);
const member = randomUUID();
const other = randomUUID();
const admin = randomUUID();
const USER_IDS = [member, other, admin];

const NOW = new Date("2026-09-18T12:00:00.000Z");

let configured = false;

describe("bans (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;
    await prisma.user.createMany({
      data: [
        {
          id: member,
          email: `b-${suffix}@t.internal`,
          username: `b${suffix}`,
          displayName: "Banni",
        },
        {
          id: other,
          email: `o-${suffix}@t.internal`,
          username: `o${suffix}`,
          displayName: "Autre",
        },
        {
          id: admin,
          email: `ba-${suffix}@t.internal`,
          username: `ba${suffix}`,
          displayName: "Admin",
          role: "ADMIN",
        },
      ],
    });
    configured = true;
  });

  afterEach(async () => {
    if (!configured) return;
    await prisma.userBan.deleteMany({ where: { userId: { in: USER_IDS } } });
    await prisma.contactTicket.deleteMany({ where: { userId: { in: USER_IDS } } });
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.user.deleteMany({ where: { id: { in: USER_IDS } } });
  });

  async function ban(over: { expiresAt?: Date | null } = {}) {
    return banRepository.issue({
      userId: member,
      reason: "Propos injurieux répétés dans le forum, malgré deux avertissements.",
      expiresAt: over.expiresAt === undefined ? null : over.expiresAt,
      issuedById: admin,
      now: NOW,
    });
  }

  it("keeps a permanent ban in force", async () => {
    if (!configured) return;
    await ban();

    const active = await banRepository.findActive(member, NOW);
    expect(active?.reason).toContain("Propos injurieux");
    expect(active?.expiresAt).toBeNull();
  });

  it("holds a timed ban until its end, and not a moment longer", async () => {
    if (!configured) return;
    const ends = new Date(NOW.getTime() + 3_600_000);
    await ban({ expiresAt: ends });

    expect(await banRepository.findActive(member, NOW)).not.toBeNull();
    // At the stroke of the hour it is over. Keeping somebody out for one more
    // millisecond reads as a bug at the only moment anybody checks the clock.
    expect(await banRepository.findActive(member, ends)).toBeNull();
    expect(await banRepository.findActive(member, new Date(ends.getTime() + 1))).toBeNull();
  });

  it("refuses to stack a second ban on top of the first", async () => {
    if (!configured) return;
    await ban();

    const second = await ban();
    // Two reasons and two end dates for one person, where lifting one of them
    // would look like it had done nothing.
    expect(second).toEqual({ ok: false, reason: "ALREADY_BANNED" });
    expect(await prisma.userBan.count({ where: { userId: member } })).toBe(1);
  });

  it("bans one account without touching another", async () => {
    if (!configured) return;
    await ban();
    expect(await banRepository.findActive(other, NOW)).toBeNull();
  });

  it("lets somebody back in, and keeps the record of why they were out", async () => {
    if (!configured) return;
    await ban();

    const lifted = await banRepository.lift({
      userId: member,
      liftedById: admin,
      reason: "Appel accepté",
      now: NOW,
    });

    expect(lifted).toBe(true);
    expect(await banRepository.findActive(member, NOW)).toBeNull();
    // Lifted, not deleted. The record of a decision made about a person is what
    // makes the next decision about them fair.
    const row = await prisma.userBan.findFirstOrThrow({ where: { userId: member } });
    expect(row.liftedAt).not.toBeNull();
    expect(row.liftedById).toBe(admin);
    expect(row.liftReason).toBe("Appel accepté");
  });

  it("overrules an end date still in the future", async () => {
    if (!configured) return;
    await ban({ expiresAt: new Date("2027-01-01T00:00:00.000Z") });
    await banRepository.lift({ userId: member, liftedById: admin, now: NOW });

    expect(await banRepository.findActive(member, NOW)).toBeNull();
  });

  it("says plainly when there was nothing to lift", async () => {
    if (!configured) return;
    expect(await banRepository.lift({ userId: member, liftedById: admin, now: NOW })).toBe(false);
  });

  it("lets a ban be issued again once the last one is over", async () => {
    if (!configured) return;
    await ban();
    await banRepository.lift({ userId: member, liftedById: admin, now: NOW });

    const again = await ban();
    expect(again.ok).toBe(true);
    expect(await prisma.userBan.count({ where: { userId: member } })).toBe(2);
  });

  it("marks the notice as seen once", async () => {
    if (!configured) return;
    const issued = await ban();
    const banId = issued.ok ? issued.ban.id : "";

    await banRepository.acknowledge(banId, member, NOW);
    const first = await prisma.userBan.findUniqueOrThrow({ where: { id: banId } });
    expect(first.acknowledgedAt).not.toBeNull();

    // Closing it again does not move the timestamp: it is when they first saw
    // it, not when they last dismissed it.
    const later = new Date(NOW.getTime() + 60_000);
    await banRepository.acknowledge(banId, member, later);
    const second = await prisma.userBan.findUniqueOrThrow({ where: { id: banId } });
    expect(second.acknowledgedAt?.getTime()).toBe(first.acknowledgedAt?.getTime());
  });

  it("does not let one account acknowledge another's ban", async () => {
    if (!configured) return;
    const issued = await ban();
    const banId = issued.ok ? issued.ban.id : "";

    await banRepository.acknowledge(banId, other, NOW);

    const row = await prisma.userBan.findUniqueOrThrow({ where: { id: banId } });
    expect(row.acknowledgedAt).toBeNull();
  });

  it("accepts one appeal per ban and no more", async () => {
    if (!configured) return;
    const issued = await ban();
    const banId = issued.ok ? issued.ban.id : "";

    const first = await prisma.contactTicket.create({
      data: {
        userId: member,
        email: `b-${suffix}@t.internal`,
        subject: "Appel d'une décision de bannissement",
        theme: "BAN_APPEAL",
        message: "Je conteste.",
      },
      select: { id: true },
    });
    const second = await prisma.contactTicket.create({
      data: {
        userId: member,
        email: `b-${suffix}@t.internal`,
        subject: "Appel d'une décision de bannissement",
        theme: "BAN_APPEAL",
        message: "Je conteste encore.",
      },
      select: { id: true },
    });

    expect(await banRepository.attachAppeal(banId, member, first.id)).toBe(true);
    // The same decision is the same conversation, and it already has a thread.
    expect(await banRepository.attachAppeal(banId, member, second.id)).toBe(false);

    const row = await prisma.userBan.findUniqueOrThrow({ where: { id: banId } });
    expect(row.appealTicketId).toBe(first.id);
  });

  it("keeps the ban when the appeal ticket is deleted", async () => {
    if (!configured) return;
    const issued = await ban();
    const banId = issued.ok ? issued.ban.id : "";
    const ticket = await prisma.contactTicket.create({
      data: {
        userId: member,
        email: `b-${suffix}@t.internal`,
        subject: "Appel",
        theme: "BAN_APPEAL",
        message: "Je conteste.",
      },
      select: { id: true },
    });
    await banRepository.attachAppeal(banId, member, ticket.id);

    await prisma.contactTicket.delete({ where: { id: ticket.id } });

    // A deleted ticket must not take the ban down with it - that would let
    // somebody clear their own ban by deleting their own appeal.
    const row = await prisma.userBan.findUniqueOrThrow({ where: { id: banId } });
    expect(row.appealTicketId).toBeNull();
    expect(await banRepository.findActive(member, NOW)).not.toBeNull();
  });
});
