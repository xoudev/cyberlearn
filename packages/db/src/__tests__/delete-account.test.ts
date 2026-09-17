/**
 * Unit tests for deleteAccount (RGPD Art. 17).
 *
 * Prisma is fully mocked - no live database required. True transaction
 * rollback atomicity is a Postgres property; what is checked here is call
 * ordering, argument shapes, and what survives a failure.
 *
 * Moved here with the implementation, which left apps/web so the admin console
 * could delete an account through the same code rather than a second copy of
 * it. The suite grew the two things that move brought: the auth identity now
 * goes with the data, and an administrator is recorded as the one who acted.
 */

import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { pseudonymize } from "@cyberlearn/lib/pseudonymize";
import { deleteAccount } from "../rgpd/delete-account.js";

// pseudonymize reads IP_SALT at call time.
vi.stubEnv("IP_SALT", "delete-account-test-salt-that-is-at-least-32-chars");

const { mockTx, mockPrisma, mockStorageRemove, mockDeleteUser, mockCleanupError, storageBuckets } =
  vi.hoisted(() => {
    const mockTx = {
      user: { findUnique: vi.fn(), delete: vi.fn() },
      certificate: { count: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
      lessonQuestion: { count: vi.fn(), updateMany: vi.fn() },
      lessonAnswer: { count: vi.fn(), updateMany: vi.fn() },
      rating: { count: vi.fn(), updateMany: vi.fn() },
      contactTicket: { count: vi.fn(), updateMany: vi.fn() },
      auditLog: { count: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    };

    return {
      mockTx,
      mockPrisma: { $transaction: vi.fn(), auditLog: { create: vi.fn() } },
      mockStorageRemove: vi.fn(),
      mockDeleteUser: vi.fn(),
      mockCleanupError: vi.fn(),
      // Which bucket each remove() call went to, in order.
      storageBuckets: [] as string[],
    };
  });

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

// The admin client reaches for the service_role key at call time; stubbing it
// keeps this suite free of env requirements and lets the erasure be asserted.
vi.mock("../supabase/admin.js", () => ({
  createSupabaseAdminClient: () => ({
    storage: {
      from: (bucket: string) => {
        storageBuckets.push(bucket);
        return { remove: mockStorageRemove };
      },
    },
    auth: { admin: { deleteUser: mockDeleteUser } },
  }),
}));

// SAFETY: Vitest's expect.objectContaining() is typed as any; project back to
// the sample type T so no-unsafe-assignment does not fire at call sites.
function containing<T extends Record<string, unknown>>(sample: T): T {
  return expect.objectContaining(sample as never) as unknown as T;
}

const MOCK_USER_ID = randomUUID();
const MOCK_ADMIN_ID = randomUUID();
const MOCK_METADATA = { ip: "192.168.1.1", userAgent: "Mozilla/5.0 (test)" };

const MOCK_USER = {
  id: MOCK_USER_ID,
  email: "user@example.com",
  displayName: "Test User",
  avatarUrl: "__upload:avatars/abc.png",
};

const MOCK_CERTIFICATE_KEYS = [`${MOCK_USER_ID}/cert-1.pdf`, `${MOCK_USER_ID}/cert-2.pdf`];

beforeEach(() => {
  vi.clearAllMocks();
  storageBuckets.length = 0;

  mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) =>
    cb(mockTx),
  );
  mockPrisma.auditLog.create.mockResolvedValue({});

  mockTx.user.findUnique.mockResolvedValue(MOCK_USER);

  mockTx.certificate.count.mockResolvedValue(2);
  mockTx.lessonQuestion.count.mockResolvedValue(1);
  mockTx.lessonAnswer.count.mockResolvedValue(2);
  mockTx.rating.count.mockResolvedValue(1);
  mockTx.contactTicket.count.mockResolvedValue(1);
  mockTx.auditLog.count.mockResolvedValue(3);
  mockTx.certificate.findMany.mockResolvedValue(
    MOCK_CERTIFICATE_KEYS.map((pdfStorageKey) => ({ pdfStorageKey })),
  );

  mockStorageRemove.mockResolvedValue({ data: [], error: null });
  mockDeleteUser.mockResolvedValue({ data: null, error: null });

  mockTx.certificate.updateMany.mockResolvedValue({ count: 2 });
  mockTx.lessonQuestion.updateMany.mockResolvedValue({ count: 1 });
  mockTx.lessonAnswer.updateMany.mockResolvedValue({ count: 2 });
  mockTx.rating.updateMany.mockResolvedValue({ count: 1 });
  mockTx.contactTicket.updateMany.mockResolvedValue({ count: 1 });
  mockTx.auditLog.updateMany.mockResolvedValue({ count: 3 });
  mockTx.user.delete.mockResolvedValue({});
  mockTx.auditLog.create.mockResolvedValue({});
});

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
    expect(summary.authIdentityDeleted).toBe(true);
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
      data: { userId: null, holderName: "Utilisateur supprimé", pdfStorageKey: "__erased__" },
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

describe("deleted by an administrator", () => {
  it("names the administrator on the audit entry and takes the given action", async () => {
    await deleteAccount(MOCK_USER_ID, {
      ...MOCK_METADATA,
      actorId: MOCK_ADMIN_ID,
      action: "admin.user.deleted",
    });

    // The person deleted is a hash; the one who pressed the button is not.
    // Anonymising both would leave no one accountable for the one action
    // nobody can review afterwards.
    expect(mockTx.auditLog.create).toHaveBeenCalledWith(
      containing({
        data: containing({
          action: "admin.user.deleted",
          actorId: MOCK_ADMIN_ID,
          actorHashedId: pseudonymize(MOCK_USER_ID),
        }),
      }),
    );
  });

  it("still erases exactly what the self-service path erases", async () => {
    await deleteAccount(MOCK_USER_ID, { ...MOCK_METADATA, actorId: MOCK_ADMIN_ID });

    expect(mockTx.user.delete).toHaveBeenCalledOnce();
    expect(mockDeleteUser).toHaveBeenCalledWith(MOCK_USER_ID);
    expect(storageBuckets).toContain("avatars");
    expect(storageBuckets).toContain("certificates");
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
    // And the identity outlives a deletion that never happened.
    expect(mockDeleteUser).not.toHaveBeenCalled();
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

    expect(mockTx.certificate.updateMany).toHaveBeenCalledOnce();
    expect(mockTx.user.delete).not.toHaveBeenCalled();
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
      containing({ data: containing({ metadata: containing({ ip: expectedHashedIp }) }) }),
    );
    expect(expectedHashedIp).not.toBe(MOCK_METADATA.ip);
  });
});

describe("performance - single transaction, updateMany only", () => {
  it("wraps all database work in exactly one $transaction call", async () => {
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

    expect(mockTx.certificate.count).toHaveBeenCalledOnce();
    expect(mockTx.lessonQuestion.count).toHaveBeenCalledOnce();
    expect(mockTx.lessonAnswer.count).toHaveBeenCalledOnce();
    expect(mockTx.rating.count).toHaveBeenCalledOnce();
    expect(mockTx.contactTicket.count).toHaveBeenCalledOnce();
    expect(mockTx.auditLog.count).toHaveBeenCalledOnce();
  });
});

describe("object storage erasure (Art. 17)", () => {
  it("removes the uploaded avatar from the avatars bucket", async () => {
    await deleteAccount(MOCK_USER_ID, MOCK_METADATA);

    expect(storageBuckets).toContain("avatars");
    expect(mockStorageRemove).toHaveBeenCalledWith(["avatars/abc.png"]);
  });

  it("leaves a preset avatar alone: it is a shared asset, not the user's file", async () => {
    mockTx.user.findUnique.mockResolvedValue({ ...MOCK_USER, avatarUrl: "/avatars/av-1.svg" });

    await deleteAccount(MOCK_USER_ID, MOCK_METADATA);

    expect(storageBuckets).not.toContain("avatars");
  });

  it("removes every certificate PDF, whose file name embeds the user id", async () => {
    await deleteAccount(MOCK_USER_ID, MOCK_METADATA);

    expect(mockStorageRemove).toHaveBeenCalledWith(MOCK_CERTIFICATE_KEYS);
  });

  it("skips placeholder storage keys that point at no object", async () => {
    mockTx.certificate.findMany.mockResolvedValue([
      { pdfStorageKey: "pending" },
      { pdfStorageKey: "__erased__" },
      { pdfStorageKey: "" },
    ]);

    await deleteAccount(MOCK_USER_ID, MOCK_METADATA);

    expect(storageBuckets).not.toContain("certificates");
  });

  it("erases files only after the transaction commits", async () => {
    mockPrisma.$transaction.mockRejectedValue(new Error("rollback"));

    await expect(deleteAccount(MOCK_USER_ID, MOCK_METADATA)).rejects.toThrow("rollback");

    // A rollback leaves the rows in place, so the files must survive too - and
    // so must the identity, or the account would be locked out of its own data.
    expect(mockStorageRemove).not.toHaveBeenCalled();
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("reports a storage failure without failing the deletion", async () => {
    mockStorageRemove.mockResolvedValue({ data: null, error: { message: "bucket offline" } });

    const summary = await deleteAccount(MOCK_USER_ID, {
      ...MOCK_METADATA,
      onCleanupError: mockCleanupError,
    });

    expect(summary.certificatesAnonymized).toBe(2);
    expect(mockCleanupError).toHaveBeenCalled();
  });

  it("never surfaces the raw user id to the cleanup reporter", async () => {
    mockStorageRemove.mockResolvedValue({ data: null, error: { message: "storage down" } });

    await deleteAccount(MOCK_USER_ID, { ...MOCK_METADATA, onCleanupError: mockCleanupError });

    const [, , context] = mockCleanupError.mock.calls[0] as [
      string,
      unknown,
      { hashedUserId: string },
    ];
    expect(context.hashedUserId).toBe(pseudonymize(MOCK_USER_ID));
    expect(context.hashedUserId).not.toBe(MOCK_USER_ID);
  });
});

describe("auth identity", () => {
  it("deletes auth.users, so the erasure cannot undo itself at the next login", async () => {
    await deleteAccount(MOCK_USER_ID, MOCK_METADATA);

    expect(mockDeleteUser).toHaveBeenCalledWith(MOCK_USER_ID);
  });

  it("reports a surviving identity instead of throwing, and audits it", async () => {
    mockDeleteUser.mockResolvedValue({ data: null, error: { message: "auth unreachable" } });

    const summary = await deleteAccount(MOCK_USER_ID, {
      ...MOCK_METADATA,
      onCleanupError: mockCleanupError,
    });

    // The data is gone, which is what Art. 17 turns on. Throwing here would
    // tell the caller nothing happened, which is the one thing that is untrue.
    expect(summary.authIdentityDeleted).toBe(false);
    expect(summary.certificatesAnonymized).toBe(2);

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      containing({
        data: containing({
          action: "user.account.auth_delete_failed",
          actorHashedId: pseudonymize(MOCK_USER_ID),
          anonymized: true,
        }),
      }),
    );
  });
});
