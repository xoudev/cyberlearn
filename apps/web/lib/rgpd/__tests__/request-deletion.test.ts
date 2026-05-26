/**
 * Unit tests for requestDeletion (RGPD Art. 17 — token generation + email flow).
 *
 * Verifies: token is hashed before DB storage, plain token appears only in
 * the confirmUrl, email is sent with correct args, audit log is created,
 * and email failure is handled gracefully.
 */

import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("IP_SALT", "request-deletion-test-salt-that-is-at-least-32-chars");

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockPrisma, mockSendDeletionConfirmEmail } = vi.hoisted(() => {
  const mockPrisma = {
    accountDeletionToken: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  const mockSendDeletionConfirmEmail = vi.fn();
  return { mockPrisma, mockSendDeletionConfirmEmail };
});

vi.mock("@cyberlearn/db", () => ({ prisma: mockPrisma }));
vi.mock("@cyberlearn/email", () => ({
  sendDeletionConfirmEmail: mockSendDeletionConfirmEmail,
}));
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: "https://cyberlearn.app",
    RESEND_API_KEY: "re_test",
    RESEND_FROM_EMAIL: "noreply@cyberlearn.app",
  },
}));

// ── Import after mocks ────────────────────────────────────────────────────────

const { requestDeletion } = await import("../request-deletion");

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER = { id: randomUUID(), email: "alice@example.com", displayName: "Alice" };
const META = { ip: "1.2.3.4", userAgent: "Mozilla/5.0" };

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockPrisma.accountDeletionToken.create.mockResolvedValue({});
  mockPrisma.auditLog.create.mockResolvedValue({});
  mockSendDeletionConfirmEmail.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("requestDeletion — happy path", () => {
  it("returns { success: true, expiresAt } with expiresAt ~1h from now", async () => {
    const before = Date.now();
    const result = await requestDeletion(USER, META);
    const after = Date.now();
    expect(result.success).toBe(true);
    if (result.success) {
      const ms = result.expiresAt.getTime();
      expect(ms).toBeGreaterThanOrEqual(before + 3_590_000);
      expect(ms).toBeLessThanOrEqual(after + 3_610_000);
    }
  });

  it("stores the SHA-256 hash (64 hex chars), not the plain token", async () => {
    await requestDeletion(USER, META);
    expect(mockPrisma.accountDeletionToken.create).toHaveBeenCalledOnce();
    const call = mockPrisma.accountDeletionToken.create.mock.calls[0] as [
      { data: { tokenHash: string } },
    ];
    const { tokenHash } = call[0].data;
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("sends the confirmation email to the user's email address", async () => {
    await requestDeletion(USER, META);
    expect(mockSendDeletionConfirmEmail).toHaveBeenCalledOnce();
    expect(mockSendDeletionConfirmEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alice@example.com",
        displayName: "Alice",
      }),
    );
  });

  it("confirmUrl points to /api/me/delete/confirm (not /account/delete/confirm)", async () => {
    await requestDeletion(USER, META);
    const call = mockSendDeletionConfirmEmail.mock.calls[0] as [{ confirmUrl: string }];
    expect(call[0].confirmUrl).toContain("https://cyberlearn.app/api/me/delete/confirm?token=");
  });

  it("plain token in confirmUrl is base64url (43 chars of [A-Za-z0-9_-])", async () => {
    await requestDeletion(USER, META);
    const call = mockSendDeletionConfirmEmail.mock.calls[0] as [{ confirmUrl: string }];
    const url = new URL(call[0].confirmUrl);
    const token = url.searchParams.get("token") ?? "";
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("creates an audit log entry with action user.account.deletion_requested", async () => {
    await requestDeletion(USER, META);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledOnce();
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          actorId: USER.id,
          action: "user.account.deletion_requested",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          ipAddress: expect.stringMatching(/^[0-9a-f]{64}$/),
        }),
      }),
    );
  });

  it("token stored in DB is never the plain token (different from confirmUrl token)", async () => {
    await requestDeletion(USER, META);

    const dbCall = mockPrisma.accountDeletionToken.create.mock.calls[0] as [
      { data: { tokenHash: string } },
    ];
    const emailCall = mockSendDeletionConfirmEmail.mock.calls[0] as [{ confirmUrl: string }];

    const tokenHash = dbCall[0].data.tokenHash;
    const plainToken = new URL(emailCall[0].confirmUrl).searchParams.get("token") ?? "";

    // Hashes are 64 hex chars, plain tokens are 43 base64url chars — can't be equal
    expect(tokenHash).not.toBe(plainToken);
    expect(tokenHash).toHaveLength(64);
    expect(plainToken).toHaveLength(43);
  });
});

describe("requestDeletion — email failure", () => {
  it("returns { success: false, error: 'email_failed' } when Resend throws", async () => {
    mockSendDeletionConfirmEmail.mockRejectedValueOnce(new Error("Resend timeout"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation((): void => undefined);

    const result = await requestDeletion(USER, META);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("email_failed");
    }

    consoleSpy.mockRestore();
  });

  it("does not create an audit log when email fails", async () => {
    mockSendDeletionConfirmEmail.mockRejectedValueOnce(new Error("timeout"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation((): void => undefined);

    await requestDeletion(USER, META);
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
