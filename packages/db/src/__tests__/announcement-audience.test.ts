/**
 * Who a console announcement reaches. The count the console asks to confirm
 * and the list it sends to go through one filter, announcementAudienceWhere,
 * which leaves banned accounts out and reaches a class only while it is live.
 * Prisma is mocked: the filter is checked as written.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { announcementAudienceWhere, userRepository } from "../repositories/user.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { user: { count: vi.fn(), findMany: vi.fn() } },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const NOW = new Date("2026-10-17T10:00:00Z");
const CLASS_A = "11111111-1111-4111-8111-111111111111";

const NOT_BANNED = {
  bans: { none: { liftedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: NOW } }] } },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("announcementAudienceWhere", () => {
  it("reaches every account not banned right now", () => {
    expect(announcementAudienceWhere({ kind: "ALL" }, NOW)).toEqual(NOT_BANNED);
  });

  it("reaches the accounts of the roles chosen", () => {
    expect(announcementAudienceWhere({ kind: "ROLES", roles: ["TEACHER", "ADMIN"] }, NOW)).toEqual({
      AND: [NOT_BANNED, { role: { in: ["TEACHER", "ADMIN"] } }],
    });
  });

  it("reaches the members of live classes only", () => {
    expect(announcementAudienceWhere({ kind: "CLASSES", classIds: [CLASS_A] }, NOW)).toEqual({
      AND: [
        NOT_BANNED,
        {
          classMemberships: {
            some: {
              classId: { in: [CLASS_A] },
              class: {
                archivedAt: null,
                promotion: { archivedAt: null, establishment: { archivedAt: null } },
              },
            },
          },
        },
      ],
    });
  });
});

describe("userRepository audience reads", () => {
  it("counts through the filter the send uses", async () => {
    mockPrisma.user.count.mockResolvedValue(42);

    await expect(userRepository.countForAudience({ kind: "ALL" }, NOW)).resolves.toBe(42);
    expect(mockPrisma.user.count).toHaveBeenCalledWith({ where: NOT_BANNED });
  });

  it("lists each account once, in a stable order", async () => {
    mockPrisma.user.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }]);

    await expect(
      userRepository.idsForAudience({ kind: "ROLES", roles: ["STUDENT"] }, NOW),
    ).resolves.toEqual(["a", "b"]);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      where: { AND: [NOT_BANNED, { role: { in: ["STUDENT"] } }] },
      orderBy: { id: "asc" },
      select: { id: true },
    });
  });
});
