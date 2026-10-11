/**
 * Changing a role without ever leaving the console to nobody. Prisma is
 * mocked: what this checks is the order of the transaction (lock the
 * administrators, then read, then write) and what it refuses. That the lock
 * really serialises two demotions is Postgres's part of the bargain.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { userRepository } from "../repositories/user.repository.js";

const { tx, mockPrisma } = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    user: { findUnique: vi.fn(), update: vi.fn() },
  };
  return {
    tx,
    mockPrisma: {
      $transaction: vi.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
    },
  };
});

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const TARGET = "11111111-1111-4111-8111-111111111111";

function admins(count: number): { id: string }[] {
  return Array.from({ length: count }, (_, i) => ({ id: `admin-${String(i)}` }));
}

beforeEach(() => {
  vi.clearAllMocks();
  tx.user.update.mockResolvedValue({});
});

describe("changeRole", () => {
  it("locks every administrator before it reads the account", async () => {
    tx.$queryRaw.mockResolvedValue(admins(2));
    tx.user.findUnique.mockResolvedValue({ role: "STUDENT" });
    await userRepository.changeRole(TARGET, "TEACHER");

    const [strings] = tx.$queryRaw.mock.calls[0] as [TemplateStringsArray];
    expect(strings.join("?")).toMatch(/WHERE "role" = 'ADMIN' FOR UPDATE/u);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.user.findUnique.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("writes the new role and says what it was before", async () => {
    tx.$queryRaw.mockResolvedValue(admins(1));
    tx.user.findUnique.mockResolvedValue({ role: "STUDENT" });
    await expect(userRepository.changeRole(TARGET, "ADMIN")).resolves.toEqual({
      ok: true,
      previousRole: "STUDENT",
    });
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: TARGET }, data: { role: "ADMIN" } });
  });

  it("demotes an administrator while another one is left", async () => {
    tx.$queryRaw.mockResolvedValue(admins(2));
    tx.user.findUnique.mockResolvedValue({ role: "ADMIN" });
    await expect(userRepository.changeRole(TARGET, "TEACHER")).resolves.toEqual({
      ok: true,
      previousRole: "ADMIN",
    });
    expect(tx.user.update).toHaveBeenCalled();
  });

  it("refuses to demote the last administrator", async () => {
    tx.$queryRaw.mockResolvedValue(admins(1));
    tx.user.findUnique.mockResolvedValue({ role: "ADMIN" });
    await expect(userRepository.changeRole(TARGET, "STUDENT")).resolves.toEqual({
      ok: false,
      reason: "LAST_ADMIN",
    });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it("says so when the account is gone, rather than throwing on the update", async () => {
    tx.$queryRaw.mockResolvedValue(admins(2));
    tx.user.findUnique.mockResolvedValue(null);
    await expect(userRepository.changeRole(TARGET, "TEACHER")).resolves.toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it("writes nothing when the role does not change", async () => {
    tx.$queryRaw.mockResolvedValue(admins(1));
    tx.user.findUnique.mockResolvedValue({ role: "ADMIN" });
    await expect(userRepository.changeRole(TARGET, "ADMIN")).resolves.toEqual({
      ok: true,
      previousRole: "ADMIN",
    });
    expect(tx.user.update).not.toHaveBeenCalled();
  });
});
