/**
 * The retention purge against real rows: what goes, what stays.
 *
 * The filters are where a mistake would be quiet: a ticket kept forever looks
 * like nothing at all, and the appeal of a ban in force, purged, lets the same
 * person appeal the same ban a second time.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll. The
 * purge runs on the real clock and only reaches rows older than three months,
 * which no other suite writes.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { monthsBefore, purgeExpiredRecords } from "../rgpd/retention.js";

const suffix = randomUUID().slice(0, 8);
const member = randomUUID();
const STARTED = new Date();
const NOW = new Date();

let configured = false;
const ids: Record<string, string> = {};

async function ticket(
  name: string,
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
  updatedAt: Date,
): Promise<string> {
  const created = await prisma.contactTicket.create({
    data: {
      userId: member,
      email: `r-${suffix}@t.internal`,
      subject: `${name} ${suffix}`,
      theme: "QUESTION",
      message: "Bonjour.",
      status,
    },
    select: { id: true },
  });
  // updatedAt is @updatedAt: Prisma would stamp it with now, so it is set here.
  await prisma.$executeRaw`UPDATE contact_tickets SET "updatedAt" = ${updatedAt} WHERE id = ${created.id}::uuid`;
  ids[name] = created.id;
  return created.id;
}

async function exists(name: string): Promise<boolean> {
  const id = ids[name];
  if (id === undefined) throw new Error(`no ticket ${name}`);
  return (await prisma.contactTicket.count({ where: { id } })) === 1;
}

describe("retention purge (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;
    await prisma.user.create({
      data: {
        id: member,
        email: `r-${suffix}@t.internal`,
        username: `r${suffix}`,
        displayName: "Rétention",
      },
    });
    configured = true;

    const fourMonthsAgo = monthsBefore(NOW, 4);
    const twoMonthsAgo = monthsBefore(NOW, 2);
    const thirteenMonthsAgo = monthsBefore(NOW, 13);
    const elevenMonthsAgo = monthsBefore(NOW, 11);

    await ticket("resolvedOld", "RESOLVED", fourMonthsAgo);
    await ticket("closedOld", "CLOSED", fourMonthsAgo);
    await ticket("resolvedRecent", "RESOLVED", twoMonthsAgo);
    await ticket("openOld", "OPEN", thirteenMonthsAgo);
    await ticket("inProgressOld", "IN_PROGRESS", thirteenMonthsAgo);
    await ticket("openRecent", "OPEN", elevenMonthsAgo);
    // An open ticket four months quiet is not resolved: twelve months for it.
    await ticket("openFourMonths", "OPEN", fourMonthsAgo);

    await prisma.ticketMessage.create({
      data: { ticketId: ids["resolvedOld"] ?? "", fromStaff: true, body: "Réglé." },
    });

    // Two appeals, both resolved four months ago: one against a ban still in
    // force, one against a ban since lifted.
    const appealInForce = await ticket("appealInForce", "RESOLVED", fourMonthsAgo);
    const appealLifted = await ticket("appealLifted", "RESOLVED", fourMonthsAgo);
    await prisma.userBan.create({
      data: { userId: member, reason: "Spam.", appealTicketId: appealInForce },
    });
    await prisma.userBan.create({
      data: {
        userId: member,
        reason: "Insultes.",
        appealTicketId: appealLifted,
        liftedAt: monthsBefore(NOW, 3),
      },
    });

    await prisma.auditLog.createMany({
      data: [
        {
          action: `retention.test.old.${suffix}`,
          targetType: "Test",
          createdAt: thirteenMonthsAgo,
        },
        {
          action: `retention.test.recent.${suffix}`,
          targetType: "Test",
          createdAt: elevenMonthsAgo,
        },
      ],
    });
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.userBan.deleteMany({ where: { userId: member } });
    await prisma.contactTicket.deleteMany({ where: { userId: member } });
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { action: { startsWith: `retention.test.` } },
          { action: "retention.purge", createdAt: { gte: STARTED } },
        ],
      },
    });
    await prisma.user.deleteMany({ where: { id: member } });
  });

  it("deletes what has outlived its retention, and only that", async () => {
    if (!configured) return;
    const summary = await purgeExpiredRecords(new Date());

    expect(summary.resolvedTickets).toBeGreaterThanOrEqual(3);
    expect(summary.openTickets).toBeGreaterThanOrEqual(2);
    expect(summary.auditLogs).toBeGreaterThanOrEqual(1);

    for (const gone of ["resolvedOld", "closedOld", "openOld", "inProgressOld", "appealLifted"]) {
      expect(await exists(gone), gone).toBe(false);
    }
    for (const kept of ["resolvedRecent", "openRecent", "openFourMonths", "appealInForce"]) {
      expect(await exists(kept), kept).toBe(true);
    }
  });

  it("takes a deleted ticket's messages with it", async () => {
    if (!configured) return;
    expect(
      await prisma.ticketMessage.count({ where: { ticketId: ids["resolvedOld"] ?? "" } }),
    ).toBe(0);
  });

  it("keeps the ban whose appeal went, and the link of the one in force", async () => {
    if (!configured) return;
    const bans = await prisma.userBan.findMany({
      where: { userId: member },
      select: { reason: true, appealTicketId: true },
      orderBy: { reason: "asc" },
    });
    expect(bans).toEqual([
      { reason: "Insultes.", appealTicketId: null },
      { reason: "Spam.", appealTicketId: ids["appealInForce"] },
    ]);
  });

  it("purges audit entries past twelve months and records the run", async () => {
    if (!configured) return;
    const actions = (
      await prisma.auditLog.findMany({
        where: { action: { startsWith: `retention.test.` }, targetType: "Test" },
        select: { action: true },
      })
    ).map((a) => a.action);
    expect(actions).toEqual([`retention.test.recent.${suffix}`]);
    expect(
      await prisma.auditLog.count({
        where: { action: "retention.purge", createdAt: { gte: STARTED } },
      }),
    ).toBeGreaterThanOrEqual(1);
  });
});
