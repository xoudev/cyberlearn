/**
 * notificationRepository.createMany: a message to many accounts, written in
 * batches small enough for Postgres's bind-parameter ceiling, all of them in
 * one transaction with the audit row that says who sent it. Prisma is mocked:
 * what this checks is the slicing, the transaction and the trace.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  NOTIFICATION_BATCH_SIZE,
  notificationRepository,
  type NotificationRow,
} from "../repositories/notification.repository.js";

const { tx, mockPrisma } = vi.hoisted(() => {
  const tx = {
    notification: {
      createMany: vi.fn((args: { data: unknown[] }) =>
        Promise.resolve({ count: args.data.length }),
      ),
    },
    auditLog: { create: vi.fn() },
  };
  return {
    tx,
    mockPrisma: {
      $transaction: vi.fn<
        (run: (client: typeof tx) => Promise<unknown>, options?: { timeout?: number }) => unknown
      >((run) => run(tx)),
    },
  };
});

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const ADMIN = "11111111-1111-4111-8111-111111111111";

function rows(count: number): NotificationRow[] {
  return Array.from({ length: count }, (_, i) => ({
    userId: `user-${String(i)}`,
    type: "ANNOUNCEMENT",
    title: "Maintenance samedi",
    body: "Le site sera coupé de 8 h à 9 h.",
    metadata: { announcementId: "a-1" },
  }));
}

function batchSizes(): number[] {
  return tx.notification.createMany.mock.calls.map(([args]) => args.data.length);
}

beforeEach(() => {
  vi.clearAllMocks();
  tx.auditLog.create.mockResolvedValue({});
});

describe("notificationRepository.createMany", () => {
  it("writes a thousand rows per statement by default, and returns how many it wrote", async () => {
    expect(NOTIFICATION_BATCH_SIZE).toBe(1_000);

    const written = await notificationRepository.createMany(rows(2_501));

    expect(written).toBe(2_501);
    expect(batchSizes()).toEqual([1_000, 1_000, 501]);
  });

  it("runs every batch in one transaction, with room for a large audience", async () => {
    await notificationRepository.createMany(rows(5), { batchSize: 2 });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.$transaction.mock.calls[0]?.[1]).toEqual({ timeout: 60_000 });
    expect(batchSizes()).toEqual([2, 2, 1]);
  });

  it("writes each row as given, with no link as null", async () => {
    await notificationRepository.createMany([
      { userId: "u-1", type: "ANNOUNCEMENT", title: "T", body: "B" },
      {
        userId: "u-2",
        type: "ANNOUNCEMENT",
        title: "T",
        body: "B",
        actionUrl: "/paths",
        metadata: { announcementId: "a-2" },
      },
    ]);

    expect(tx.notification.createMany).toHaveBeenCalledWith({
      data: [
        { userId: "u-1", type: "ANNOUNCEMENT", title: "T", body: "B", actionUrl: null },
        {
          userId: "u-2",
          type: "ANNOUNCEMENT",
          title: "T",
          body: "B",
          actionUrl: "/paths",
          metadata: { announcementId: "a-2" },
        },
      ],
    });
  });

  it("writes the audit row after the notifications, inside the same transaction", async () => {
    const order: string[] = [];
    tx.notification.createMany.mockImplementation((args: { data: unknown[] }) => {
      order.push("notifications");
      return Promise.resolve({ count: args.data.length });
    });
    tx.auditLog.create.mockImplementation(() => {
      order.push("audit");
      return Promise.resolve({});
    });

    await notificationRepository.createMany(rows(3), {
      audit: {
        actorId: ADMIN,
        action: "announcement.send",
        targetType: "Announcement",
        targetId: "a-1",
        metadata: { recipients: 3 },
      },
    });

    expect(order).toEqual(["notifications", "audit"]);
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: ADMIN,
        action: "announcement.send",
        targetType: "Announcement",
        targetId: "a-1",
        metadata: { recipients: 3 },
      },
    });
  });

  it("lets a failed batch fail the whole call, so nothing is half sent", async () => {
    tx.notification.createMany
      .mockResolvedValueOnce({ count: 2 })
      .mockRejectedValueOnce(new Error("connection reset"));

    await expect(
      notificationRepository.createMany(rows(4), {
        batchSize: 2,
        audit: {
          actorId: ADMIN,
          action: "announcement.send",
          targetType: "Announcement",
          metadata: {},
        },
      }),
    ).rejects.toThrow("connection reset");
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("asks nothing of the database for no rows and no trace", async () => {
    expect(await notificationRepository.createMany([])).toBe(0);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses a batch size that would loop forever or not at all", async () => {
    await expect(notificationRepository.createMany(rows(1), { batchSize: 0 })).rejects.toThrow(
      RangeError,
    );
    await expect(notificationRepository.createMany(rows(1), { batchSize: 1.5 })).rejects.toThrow(
      RangeError,
    );
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
