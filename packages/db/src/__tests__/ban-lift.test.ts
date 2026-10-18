/**
 * Lifting a ban, as the statement it sends. Prisma is mocked: what this checks
 * is the where clause (the ban's id beside the "in force" filter, in the
 * statement that writes) and that the journal's line rides in the same
 * transaction, only for a lift that happened. bans.integration.test.ts runs
 * the same calls on a real database.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { banRepository } from "../repositories/ban.repository.js";

const { tx, mockPrisma } = vi.hoisted(() => {
  const tx = {
    userBan: { updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    tx,
    mockPrisma: {
      $transaction: vi.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
    },
  };
});

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const LEARNER = "11111111-1111-4111-8111-111111111111";
const BAN = "22222222-2222-4222-8222-222222222222";
const ADMIN = "33333333-3333-4333-8333-333333333333";
const NOW = new Date("2026-10-18T12:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  tx.userBan.updateMany.mockResolvedValue({ count: 1 });
  tx.auditLog.create.mockResolvedValue({});
});

describe("banRepository.lift", () => {
  it("narrows to the ban it is given, under the same in-force filter", async () => {
    await banRepository.lift({ userId: LEARNER, banId: BAN, liftedById: ADMIN, now: NOW });

    expect(tx.userBan.updateMany).toHaveBeenCalledWith({
      where: {
        userId: LEARNER,
        id: BAN,
        liftedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: NOW } }],
      },
      data: { liftedAt: NOW, liftedById: ADMIN, liftReason: null },
    });
  });

  it("lifts whichever ban is in force when no id is given", async () => {
    await banRepository.lift({ userId: LEARNER, liftedById: ADMIN, now: NOW });
    const [args] = tx.userBan.updateMany.mock.calls[0] as [{ where: Record<string, unknown> }];
    expect(args.where).not.toHaveProperty("id");
  });

  it("writes the journal's line in the lift's transaction", async () => {
    const auditMetadata = { reason: "Appel accepté", ticketId: "t-1", banId: BAN };
    await expect(
      banRepository.lift({
        userId: LEARNER,
        banId: BAN,
        liftedById: ADMIN,
        reason: "Appel accepté",
        auditMetadata,
        now: NOW,
      }),
    ).resolves.toBe(true);

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: ADMIN,
        action: "admin.user.ban_lifted",
        targetType: "User",
        targetId: LEARNER,
        metadata: auditMetadata,
      },
    });
    expect(tx.userBan.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.auditLog.create.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("writes no line for a lift that did not happen", async () => {
    tx.userBan.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      banRepository.lift({
        userId: LEARNER,
        banId: BAN,
        liftedById: ADMIN,
        auditMetadata: { banId: BAN },
        now: NOW,
      }),
    ).resolves.toBe(false);
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("writes no line when the caller writes its own", async () => {
    await expect(
      banRepository.lift({ userId: LEARNER, liftedById: ADMIN, now: NOW }),
    ).resolves.toBe(true);
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
