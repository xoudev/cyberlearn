/**
 * Unit tests for deleteAccount (RGPD Art. 17).
 *
 * Prisma is fully mocked - no live database required.
 * True transaction rollback atomicity (Postgres-level) is verified via
 * integration tests; here we verify call ordering, argument shapes, and
 * error propagation.
 */

import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Env stub - pseudonymize reads IP_SALT at call time ────────────────────
vi.stubEnv("IP_SALT", "delete-account-test-salt-that-is-at-least-32-chars");

// ── Hoisted mocks - must be created before vi.mock factories run ──────────

const { mockTx, mockPrisma } = vi.hoisted(() => {
  const mockTx = {
    user: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    certificate: {
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    lessonQuestion: {
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    lessonAnswer: {
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    rating: {
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    contactTicket: {
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: {
      count: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
  };

  const mockPrisma = {
    $transaction: vi.fn(),
  };

  return { mockTx, mockPrisma };
});

vi.mock("@cyberlearn/db", () => ({
  prisma: mockPrisma,
}));

// ── Import after mocks are registered ────────────────────────────────────
const { deleteAccount } = await import("@/lib/rgpd/delete-account");
const { pseudonymize } = await import("@/lib/pseudonymize");

// ── Typed objectContaining wrapper ────────────────────────────────────────
// SAFETY: Vitest's expect.objectContaining() is typed as any; we project back
// to the sample type T so no-unsafe-assignment doesn't fire at call sites.
function containing<T extends Record<string, unknown>>(sample: T): T {
  // SAFETY: T satisfies DeeplyAllowMatchers<T> at runtime; cast via never to bypass the
  // structural mismatch between T and Vitest's DeeplyAllowMatchers<T> widened type.
  return expect.objectContaining(sample as never) as unknown as T;
}

// ── Shared fixtures ───────────────────────────────────────────────────────

const MOCK_USER_ID = randomUUID();
const MOCK_METADATA = { ip: "192.168.1.1", userAgent: "Mozilla/5.0 (test)" };

const MOCK_USER = { id: MOCK_USER_ID, email: "user@example.com", displayName: "Test User" };

// ── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Restore $transaction to execute the callback synchronously
  mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) =>
    cb(mockTx),
  );

  // Default user lookup: exists
  mockTx.user.findUnique.mockResolvedValue(MOCK_USER);

  // Default counts - 2 certs, 1 question, 2 answers, 1 rating, 1 ticket, 3 audit logs
  mockTx.certificate.count.mockResolvedValue(2);
  mockTx.lessonQuestion.count.mockResolvedValue(1);
  mockTx.lessonAnswer.count.mockResolvedValue(2);
  mockTx.rating.count.mockResolvedValue(1);
  mockTx.contactTicket.count.mockResolvedValue(1);
  mockTx.auditLog.count.mockResolvedValue(3);

  // Default mutations resolve successfully
  mockTx.certificate.updateMany.mockResolvedValue({ count: 2 });
  mockTx.lessonQuestion.updateMany.mockResolvedValue({ count: 1 });
  mockTx.lessonAnswer.updateMany.mockResolvedValue({ count: 2 });
  mockTx.rating.updateMany.mockResolvedValue({ count: 1 });
  mockTx.contactTicket.updateMany.mockResolvedValue({ count: 1 });
  mockTx.auditLog.updateMany.mockResolvedValue({ count: 3 });
  mockTx.user.delete.mockResolvedValue({});
  mockTx.auditLog.create.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe("happy path", () => {
  it("returns a correct DeletionSummary", async () => {
    const summary = await deleteAccount(MOCK_USER_ID, MOCK_METADATA);

    expect(summary.hashedUserId).toBe(pseudonymize(MOCK_USER_ID));
    expect(summary.deletedAt).toBeInstanceOf(Date);
    expect(summary.certificatesAnonymized).toBe(2);
    expect(summary.questionsAnonymized).toBe(1);
    expect(summary.answersAnonymized).toBe(2);
    expect(summary.ratingsAnonymized).toBe(1);
    expect(summary.contactTicketsAnonymized).toBe(1);
    expect(summary.auditLogsAnonymized).toBe(3);
  });

  it("hard-deletes the user", async () => {
    await deleteAccount(MOCK_USER_ID, MOCK_METADATA);

    expect(mockTx.user.delete).toHaveBeenCalledOnce();
    expect(mockTx.user.delete).toHaveBeenCalledWith({ where: { id: MOCK_USER_ID } });
  });

  it("anonymises certificates: sets userId=null and holderName='Utilisateur supprimé'", async () => {
    await deleteAccount(MOCK_USER_ID, MOCK_METADATA);

    expect(mockTx.certificate.updateMany).toHaveBeenCalledWith({
      where: { userId: MOCK_USER_ID },
      data: { userId: null, holderName: "Utilisateur supprimé" },
    });
  });

  it("anonymises questions and answers: sets userId=null", async () => {
    await deleteAccount(MOCK_USER_ID, MOCK_METADATA);

    expect(mockTx.lessonQuestion.updateMany).toHaveBeenCalledWith({
      where: { userId: MOCK_USER_ID },
      data: { userId: null },
    });
    expect(mockTx.lessonAnswer.updateMany).toHaveBeenCalledWith({
      where: { userId: MOCK_USER_ID },
      data: { userId: null },
    });
  });

  it("anonymises ratings: sets userId=null", async () => {
    await deleteAccount(MOCK_USER_ID, MOCK_METADATA);

    expect(mockTx.rating.updateMany).toHaveBeenCalledWith({
      where: { userId: MOCK_USER_ID },
      data: { userId: null },
    });
  });

  it("anonymises contact tickets: sets userId=null and email=null", async () => {
    await deleteAccount(MOCK_USER_ID, MOCK_METADATA);

    expect(mockTx.contactTicket.updateMany).toHaveBeenCalledWith({
      where: { userId: MOCK_USER_ID },
      data: { userId: null, email: null },
    });
  });

  it("anonymises audit logs: actorId=null, actorHashedId set, anonymized=true", async () => {
    await deleteAccount(MOCK_USER_ID, MOCK_METADATA);

    expect(mockTx.auditLog.updateMany).toHaveBeenCalledWith({
      where: { actorId: MOCK_USER_ID },
      data: { actorId: null, actorHashedId: pseudonymize(MOCK_USER_ID), anonymized: true },
    });
  });

  it("creates a final audit log with action 'user.account.deleted'", async () => {
    await deleteAccount(MOCK_USER_ID, MOCK_METADATA);

    expect(mockTx.auditLog.create).toHaveBeenCalledOnce();
    expect(mockTx.auditLog.create).toHaveBeenCalledWith(
      containing({
        data: containing({
          action: "user.account.deleted",
          targetType: "user",
          anonymized: true,
          actorId: null,
          actorHashedId: pseudonymize(MOCK_USER_ID),
        }),
      }),
    );
  });

  it("includes counts in the final audit log metadata", async () => {
    await deleteAccount(MOCK_USER_ID, MOCK_METADATA);

    expect(mockTx.auditLog.create).toHaveBeenCalledWith(
      containing({
        data: containing({
          metadata: containing({
            certificatesAnonymized: 2,
            questionsAnonymized: 1,
            answersAnonymized: 2,
            ratingsAnonymized: 1,
            contactTicketsAnonymized: 1,
            auditLogsAnonymized: 3,
          }),
        }),
      }),
    );
  });
});

describe("user not found", () => {
  it("throws when the user does not exist", async () => {
    mockTx.user.findUnique.mockResolvedValue(null);

    await expect(deleteAccount("non-existent-id", MOCK_METADATA)).rejects.toThrow("user not found");
  });

  it("does not attempt any mutations when user is not found", async () => {
    mockTx.user.findUnique.mockResolvedValue(null);

    await expect(deleteAccount("non-existent-id", MOCK_METADATA)).rejects.toThrow();

    expect(mockTx.certificate.updateMany).not.toHaveBeenCalled();
    expect(mockTx.user.delete).not.toHaveBeenCalled();
    expect(mockTx.auditLog.create).not.toHaveBeenCalled();
  });
});

describe("transaction atomicity", () => {
  it("propagates DB error thrown mid-transaction", async () => {
    mockTx.lessonQuestion.updateMany.mockRejectedValueOnce(new Error("DB constraint error"));

    await expect(deleteAccount(MOCK_USER_ID, MOCK_METADATA)).rejects.toThrow("DB constraint error");
  });

  it("does not call user.delete when a prior step throws", async () => {
    mockTx.lessonQuestion.updateMany.mockRejectedValueOnce(new Error("DB constraint error"));

    await expect(deleteAccount(MOCK_USER_ID, MOCK_METADATA)).rejects.toThrow();

    // certificate.updateMany ran before lessonQuestion.updateMany; user.delete must NOT have run
    expect(mockTx.certificate.updateMany).toHaveBeenCalledOnce();
    expect(mockTx.user.delete).not.toHaveBeenCalled();
    // Note: in a real Postgres transaction this would be fully rolled back;
    // here we verify the call ordering guards against partial execution.
  });
});

describe("HMAC-SHA256 determinism", () => {
  it("produces the same actorHashedId for the same userId", async () => {
    await deleteAccount(MOCK_USER_ID, MOCK_METADATA);

    const expectedHash = pseudonymize(MOCK_USER_ID);

    expect(mockTx.auditLog.updateMany).toHaveBeenCalledWith({
      where: { actorId: MOCK_USER_ID },
      data: { actorId: null, actorHashedId: expectedHash, anonymized: true },
    });
    expect(expectedHash).toHaveLength(64); // SHA-256 hex output
  });

  it("pseudonymizes IP in the final audit log metadata", async () => {
    await deleteAccount(MOCK_USER_ID, MOCK_METADATA);

    const expectedHashedIp = pseudonymize(MOCK_METADATA.ip);

    expect(mockTx.auditLog.create).toHaveBeenCalledWith(
      containing({
        data: containing({
          metadata: containing({
            ip: expectedHashedIp,
          }),
        }),
      }),
    );
    expect(expectedHashedIp).not.toBe(MOCK_METADATA.ip);
  });
});

describe("performance - single transaction, updateMany only", () => {
  it("wraps all operations in exactly one $transaction call", async () => {
    await deleteAccount(MOCK_USER_ID, MOCK_METADATA);

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
  });

  it("uses updateMany for each anonymization (no per-row updates)", async () => {
    await deleteAccount(MOCK_USER_ID, MOCK_METADATA);

    expect(mockTx.certificate.updateMany).toHaveBeenCalledTimes(1);
    expect(mockTx.lessonQuestion.updateMany).toHaveBeenCalledTimes(1);
    expect(mockTx.lessonAnswer.updateMany).toHaveBeenCalledTimes(1);
    expect(mockTx.rating.updateMany).toHaveBeenCalledTimes(1);
    expect(mockTx.contactTicket.updateMany).toHaveBeenCalledTimes(1);
    expect(mockTx.auditLog.updateMany).toHaveBeenCalledTimes(1);
  });

  it("snapshots counts inside the transaction before any mutations", async () => {
    await deleteAccount(MOCK_USER_ID, MOCK_METADATA);

    // All 6 count calls must happen in the same $transaction as the mutations
    expect(mockTx.certificate.count).toHaveBeenCalledOnce();
    expect(mockTx.lessonQuestion.count).toHaveBeenCalledOnce();
    expect(mockTx.lessonAnswer.count).toHaveBeenCalledOnce();
    expect(mockTx.rating.count).toHaveBeenCalledOnce();
    expect(mockTx.contactTicket.count).toHaveBeenCalledOnce();
    expect(mockTx.auditLog.count).toHaveBeenCalledOnce();
  });
});
