/**
 * The console's certificates: the list it reads one page at a time, and the
 * two things it does to a certificate, revoke it and put it back. Prisma is
 * mocked: what this checks is the query each filter turns into, and that a
 * revocation is written once, with its audit row and the holder's notice in
 * the same transaction, however many times it is asked for.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CERTIFICATE_AUDIT_ACTION,
  certificateRepository,
  consoleCertificateWhere,
} from "../repositories/certificate.repository.js";

const { tx, mockPrisma } = vi.hoisted(() => {
  const tx = {
    certificate: {
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    auditLog: { create: vi.fn() },
    notification: { create: vi.fn() },
  };
  return {
    tx,
    mockPrisma: {
      $transaction: vi.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
      certificate: { count: vi.fn(), findMany: vi.fn() },
      path: { findMany: vi.fn() },
    },
  };
});

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const CERT = "11111111-1111-4111-8111-111111111111";
const PUBLIC_ID = "1a2b3c4d-2222-4222-8222-222222222222";
const HOLDER = "33333333-3333-4333-8333-333333333333";
const ADMIN = "44444444-4444-4444-8444-444444444444";
const PATH = "55555555-5555-4555-8555-555555555555";
const NOW = new Date("2026-10-17T09:00:00Z");
const NOTICE = { title: "Certificat révoqué : Réseau", body: "Motif : fraude", actionUrl: "/x" };

/** The first argument of a mock's only call, as the repository passed it. */
function firstArg(fn: { mock: { calls: unknown[][] } }): Record<string, unknown> {
  const arg = fn.mock.calls[0]?.[0];
  if (typeof arg !== "object" || arg === null) throw new Error("not called with an object");
  return { ...arg };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.certificate.findMany.mockResolvedValue([]);
  tx.auditLog.create.mockResolvedValue({});
  tx.notification.create.mockResolvedValue({});
  tx.certificate.findUniqueOrThrow.mockResolvedValue({ userId: HOLDER, publicId: PUBLIC_ID });
});

describe("consoleCertificateWhere", () => {
  it("searches the printed name, the holder's account and the path, without the @", () => {
    expect(consoleCertificateWhere(" @camille ", undefined, undefined)).toEqual({
      AND: [
        {
          OR: [
            { holderName: { contains: "camille", mode: "insensitive" } },
            { user: { is: { displayName: { contains: "camille", mode: "insensitive" } } } },
            { user: { is: { username: { contains: "camille", mode: "insensitive" } } } },
            { user: { is: { email: { contains: "camille", mode: "insensitive" } } } },
            { path: { title: { contains: "camille", mode: "insensitive" } } },
          ],
        },
      ],
    });
  });

  it("finds a certificate by the number its PDF prints, in the year it prints", () => {
    const where = consoleCertificateWhere("CL-2026-1A2B3C4D", undefined, undefined);
    const or = (where.AND as { OR: unknown[] }[])[0]?.OR;
    expect(or?.[0]).toEqual({
      publicId: {
        gte: "1a2b3c4d-0000-0000-0000-000000000000",
        lte: "1a2b3c4d-ffff-ffff-ffff-ffffffffffff",
      },
      issuedAt: {
        gte: new Date("2026-01-01T00:00:00Z"),
        lt: new Date("2027-01-01T00:00:00Z"),
      },
    });
  });

  it("finds a certificate by its verification address", () => {
    const where = consoleCertificateWhere(
      `https://cyberlearn.fr/verify/${PUBLIC_ID.toUpperCase()}`,
      undefined,
      undefined,
    );
    const or = (where.AND as { OR: unknown[] }[])[0]?.OR;
    expect(or?.[0]).toEqual({ publicId: PUBLIC_ID });
  });

  it("filters by path and by state alone when there is no search", () => {
    expect(consoleCertificateWhere("", PATH, "active")).toEqual({
      AND: [{ pathId: PATH }, { revokedAt: null }],
    });
    expect(consoleCertificateWhere("", undefined, "revoked")).toEqual({
      AND: [{ revokedAt: { not: null } }],
    });
  });
});

describe("certificateRepository.listForConsole", () => {
  it("reads one page under the filters, newest first, with the count of every match", async () => {
    mockPrisma.certificate.count.mockResolvedValue(60);
    const slice = await certificateRepository.listForConsole({
      q: "",
      pathId: PATH,
      status: "revoked",
      sort: { key: "issued", dir: "desc" },
      page: 2,
      pageSize: 25,
    });
    const where = consoleCertificateWhere("", PATH, "revoked");
    expect(mockPrisma.certificate.count).toHaveBeenCalledWith({ where });
    expect(firstArg(mockPrisma.certificate.findMany)).toMatchObject({
      where,
      orderBy: [{ issuedAt: "desc" }, { id: "asc" }],
      skip: 25,
      take: 25,
    });
    expect(slice).toMatchObject({ total: 60, page: 2 });
  });

  it("leaves the certificates without a score last when it sorts by score", async () => {
    mockPrisma.certificate.count.mockResolvedValue(3);
    await certificateRepository.listForConsole({
      q: "",
      pathId: undefined,
      status: undefined,
      sort: { key: "score", dir: "desc" },
      page: 1,
      pageSize: 25,
    });
    expect(firstArg(mockPrisma.certificate.findMany)).toMatchObject({
      orderBy: [{ score: { sort: "desc", nulls: "last" } }, { id: "asc" }],
    });
  });

  it("counts every certificate, the valid ones, the revoked ones and the month's", async () => {
    mockPrisma.certificate.count
      .mockResolvedValueOnce(40)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(7);
    await expect(certificateRepository.consoleCounts(NOW)).resolves.toEqual({
      total: 40,
      active: 37,
      revoked: 3,
      lastMonth: 7,
    });
  });
});

describe("certificateRepository.revoke", () => {
  async function revoke(): ReturnType<typeof certificateRepository.revoke> {
    return certificateRepository.revoke({
      id: CERT,
      reason: "Examen passé par un tiers",
      actorId: ADMIN,
      now: NOW,
      notice: NOTICE,
      metadata: { pathTitle: "Réseau" },
    });
  }

  it("writes the revocation only on a certificate that is still valid", async () => {
    tx.certificate.updateMany.mockResolvedValue({ count: 1 });
    await expect(revoke()).resolves.toEqual({ ok: true });
    expect(tx.certificate.updateMany).toHaveBeenCalledWith({
      where: { id: CERT, revokedAt: null },
      data: { revokedAt: NOW, revokedReason: "Examen passé par un tiers" },
    });
  });

  it("traces it and tells the holder, in the same transaction", async () => {
    tx.certificate.updateMany.mockResolvedValue({ count: 1 });
    await revoke();
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(firstArg(tx.auditLog.create)).toEqual({
      data: {
        actorId: ADMIN,
        action: CERTIFICATE_AUDIT_ACTION.revoke,
        targetType: "Certificate",
        targetId: CERT,
        metadata: {
          pathTitle: "Réseau",
          publicId: PUBLIC_ID,
          holderId: HOLDER,
          reason: "Examen passé par un tiers",
        },
      },
    });
    expect(firstArg(tx.notification.create)).toEqual({
      data: {
        userId: HOLDER,
        type: "CERTIFICATE_REVOKED",
        title: NOTICE.title,
        body: NOTICE.body,
        actionUrl: NOTICE.actionUrl,
        metadata: { certId: CERT, publicId: PUBLIC_ID },
      },
    });
  });

  it("does nothing the second time: no new date, no audit row, no notice", async () => {
    tx.certificate.updateMany.mockResolvedValue({ count: 0 });
    tx.certificate.findUnique.mockResolvedValue({ id: CERT });
    await expect(revoke()).resolves.toEqual({ ok: false, reason: "ALREADY_REVOKED" });
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(tx.notification.create).not.toHaveBeenCalled();
  });

  it("says when the certificate does not exist", async () => {
    tx.certificate.updateMany.mockResolvedValue({ count: 0 });
    tx.certificate.findUnique.mockResolvedValue(null);
    await expect(revoke()).resolves.toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("tells nobody when the holder's account was erased, and still traces it", async () => {
    tx.certificate.updateMany.mockResolvedValue({ count: 1 });
    tx.certificate.findUniqueOrThrow.mockResolvedValue({ userId: null, publicId: PUBLIC_ID });
    await expect(revoke()).resolves.toEqual({ ok: true });
    expect(tx.auditLog.create).toHaveBeenCalledOnce();
    expect(tx.notification.create).not.toHaveBeenCalled();
  });
});

describe("certificateRepository.reinstate", () => {
  const REVOKED_AT = new Date("2026-10-10T12:00:00Z");

  async function reinstate(): ReturnType<typeof certificateRepository.reinstate> {
    return certificateRepository.reinstate({ id: CERT, actorId: ADMIN, notice: NOTICE });
  }

  it("clears the revocation of a revoked certificate, and keeps its number", async () => {
    tx.certificate.findUnique.mockResolvedValue({
      userId: HOLDER,
      publicId: PUBLIC_ID,
      revokedAt: REVOKED_AT,
      revokedReason: "Erreur de saisie",
    });
    tx.certificate.updateMany.mockResolvedValue({ count: 1 });
    await expect(reinstate()).resolves.toEqual({ ok: true });
    expect(tx.certificate.updateMany).toHaveBeenCalledWith({
      where: { id: CERT, revokedAt: { not: null } },
      data: { revokedAt: null, revokedReason: null },
    });
    expect(firstArg(tx.auditLog.create)).toMatchObject({
      data: {
        action: CERTIFICATE_AUDIT_ACTION.reinstate,
        targetId: CERT,
        metadata: {
          publicId: PUBLIC_ID,
          revokedAt: REVOKED_AT.toISOString(),
          previousReason: "Erreur de saisie",
        },
      },
    });
    expect(firstArg(tx.notification.create)).toMatchObject({
      data: { userId: HOLDER, type: "CERTIFICATE_ISSUED", title: NOTICE.title },
    });
  });

  it("refuses a certificate that is not revoked, without a trace or a notice", async () => {
    tx.certificate.findUnique.mockResolvedValue({
      userId: HOLDER,
      publicId: PUBLIC_ID,
      revokedAt: null,
      revokedReason: null,
    });
    tx.certificate.updateMany.mockResolvedValue({ count: 0 });
    await expect(reinstate()).resolves.toEqual({ ok: false, reason: "NOT_REVOKED" });
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(tx.notification.create).not.toHaveBeenCalled();
  });

  it("says when the certificate does not exist", async () => {
    tx.certificate.findUnique.mockResolvedValue(null);
    await expect(reinstate()).resolves.toEqual({ ok: false, reason: "NOT_FOUND" });
    expect(tx.certificate.updateMany).not.toHaveBeenCalled();
  });
});
