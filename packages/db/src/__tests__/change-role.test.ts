/**
 * Changing a role without ever leaving the console to nobody, and without a
 * change of privilege the audit log does not show. Prisma is mocked: what this
 * checks is the order of the transaction (lock the administrators, then read,
 * then write the role and its audit row) and what it refuses. That the lock
 * really serialises two demotions is Postgres's part of the bargain.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { userRepository } from "../repositories/user.repository.js";

const { tx, mockPrisma } = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    user: { findUnique: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    tx,
    mockPrisma: {
      $transaction: vi.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
      auditLog: { findFirst: vi.fn() },
    },
  };
});

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const TARGET = "11111111-1111-4111-8111-111111111111";
const ACTOR = "22222222-2222-4222-8222-222222222222";
const BY = { actorId: ACTOR };

function admins(count: number): { id: string }[] {
  return Array.from({ length: count }, (_, i) => ({ id: `admin-${String(i)}` }));
}

beforeEach(() => {
  vi.clearAllMocks();
  tx.user.update.mockResolvedValue({});
  tx.auditLog.create.mockResolvedValue({});
});

describe("changeRole", () => {
  it("locks every administrator before it reads the account", async () => {
    tx.$queryRaw.mockResolvedValue(admins(2));
    tx.user.findUnique.mockResolvedValue({ role: "STUDENT" });
    await userRepository.changeRole(TARGET, "TEACHER", BY);

    // The mock is untyped; $queryRaw is a tagged template, so its first
    // argument is the strings array.
    const [strings] = tx.$queryRaw.mock.calls[0] as [TemplateStringsArray];
    expect(strings.join("?")).toMatch(/WHERE "role" = 'ADMIN' FOR UPDATE/u);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.user.findUnique.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("writes the new role and says what it was before", async () => {
    tx.$queryRaw.mockResolvedValue(admins(1));
    tx.user.findUnique.mockResolvedValue({ role: "STUDENT" });
    await expect(userRepository.changeRole(TARGET, "ADMIN", BY)).resolves.toEqual({
      ok: true,
      previousRole: "STUDENT",
    });
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: TARGET }, data: { role: "ADMIN" } });
  });

  it("writes the audit row in the same transaction, after the role, with the role it replaced", async () => {
    tx.$queryRaw.mockResolvedValue(admins(2));
    tx.user.findUnique.mockResolvedValue({ role: "ADMIN" });
    await userRepository.changeRole(TARGET, "STUDENT", BY);

    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: ACTOR,
        action: "user.role.update",
        targetType: "User",
        targetId: TARGET,
        metadata: { newRole: "STUDENT", previousRole: "ADMIN" },
      },
    });
    expect(tx.user.update.mock.invocationCallOrder[0]).toBeLessThan(
      tx.auditLog.create.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("fails as a whole when the audit row cannot be written", async () => {
    // Inside $transaction, a throw rolls the role back: no privilege change
    // goes through without its trace.
    tx.$queryRaw.mockResolvedValue(admins(2));
    tx.user.findUnique.mockResolvedValue({ role: "STUDENT" });
    tx.auditLog.create.mockRejectedValue(new Error("audit_logs unavailable"));
    await expect(userRepository.changeRole(TARGET, "ADMIN", BY)).rejects.toThrow(
      "audit_logs unavailable",
    );
  });

  it("demotes an administrator while another one is left", async () => {
    tx.$queryRaw.mockResolvedValue(admins(2));
    tx.user.findUnique.mockResolvedValue({ role: "ADMIN" });
    await expect(userRepository.changeRole(TARGET, "TEACHER", BY)).resolves.toEqual({
      ok: true,
      previousRole: "ADMIN",
    });
    expect(tx.user.update).toHaveBeenCalled();
  });

  it("refuses to demote the last administrator", async () => {
    tx.$queryRaw.mockResolvedValue(admins(1));
    tx.user.findUnique.mockResolvedValue({ role: "ADMIN" });
    await expect(userRepository.changeRole(TARGET, "STUDENT", BY)).resolves.toEqual({
      ok: false,
      reason: "LAST_ADMIN",
    });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("says so when the account is gone, rather than throwing on the update", async () => {
    tx.$queryRaw.mockResolvedValue(admins(2));
    tx.user.findUnique.mockResolvedValue(null);
    await expect(userRepository.changeRole(TARGET, "TEACHER", BY)).resolves.toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("writes nothing when the role does not change", async () => {
    tx.$queryRaw.mockResolvedValue(admins(1));
    tx.user.findUnique.mockResolvedValue({ role: "ADMIN" });
    await expect(userRepository.changeRole(TARGET, "ADMIN", BY)).resolves.toEqual({
      ok: true,
      previousRole: "ADMIN",
    });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});

describe("heldAdminRoleSince", () => {
  const since = new Date("2026-09-11T00:00:00Z");

  it("looks for a role change to or from ADMIN on this account in the span", async () => {
    mockPrisma.auditLog.findFirst.mockResolvedValue({ id: "log-1" });
    await expect(userRepository.heldAdminRoleSince(TARGET, since)).resolves.toBe(true);
    expect(mockPrisma.auditLog.findFirst).toHaveBeenCalledWith({
      where: {
        action: "user.role.update",
        targetType: "User",
        targetId: TARGET,
        createdAt: { gte: since },
        OR: [
          { metadata: { path: ["previousRole"], equals: "ADMIN" } },
          { metadata: { path: ["newRole"], equals: "ADMIN" } },
        ],
      },
      select: { id: true },
    });
  });

  it("answers false when the log shows no such change", async () => {
    mockPrisma.auditLog.findFirst.mockResolvedValue(null);
    await expect(userRepository.heldAdminRoleSince(TARGET, since)).resolves.toBe(false);
  });
});
