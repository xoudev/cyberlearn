/**
 * Unit tests for the requestDeletionAction Server Action.
 *
 * Verifies form validation, rate-limiting, user lookup, delegation to
 * requestDeletion(), and revalidation on success.
 */

import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("IP_SALT", "action-test-salt-that-is-at-least-32-chars");

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockRequireRequestUser,
  mockCheckDeletion,
  mockPrisma,
  mockRequestDeletion,
  mockRevalidatePath,
  mockHeaders,
} = vi.hoisted(() => {
  const mockRequireRequestUser = vi.fn();
  const mockCheckDeletion = vi.fn();
  const mockPrisma = { user: { findUnique: vi.fn() } };
  const mockRequestDeletion = vi.fn();
  const mockRevalidatePath = vi.fn();
  const mockHeaders = vi.fn();
  return {
    mockRequireRequestUser,
    mockCheckDeletion,
    mockPrisma,
    mockRequestDeletion,
    mockRevalidatePath,
    mockHeaders,
  };
});

vi.mock("@/lib/auth", () => ({ requireRequestUser: mockRequireRequestUser }));
vi.mock("@/lib/rate-limit", () => ({ checkAccountDeletionRequest: mockCheckDeletion }));
vi.mock("@cyberlearn/db", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/rgpd/request-deletion", () => ({ requestDeletion: mockRequestDeletion }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

// ── Import after mocks ────────────────────────────────────────────────────────

const { requestDeletionAction } = await import("../request-deletion");

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOCK_AUTH_USER = { id: randomUUID() };
const MOCK_DB_USER = {
  id: MOCK_AUTH_USER.id,
  email: "alice@example.com",
  displayName: "Alice",
};
const PASS = { success: true, limit: 3, remaining: 2, reset: 0, retryAfterSeconds: 0 };
const BLOCKED = {
  success: false,
  limit: 3,
  remaining: 0,
  reset: Date.now() + 86_400_000,
  retryAfterSeconds: 86400,
};
const EXPIRES_AT = new Date(Date.now() + 3_600_000);

function makeFormData(confirmation: string): FormData {
  const fd = new FormData();
  fd.append("confirmation", confirmation);
  return fd;
}

function makeHeadersList(
  ip = "1.2.3.4",
  ua = "test-agent",
): { get: (key: string) => string | null } {
  return {
    get: (key: string) => {
      if (key === "x-forwarded-for") return ip;
      if (key === "user-agent") return ua;
      return null;
    },
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockRequireRequestUser.mockResolvedValue(MOCK_AUTH_USER);
  mockCheckDeletion.mockResolvedValue(PASS);
  mockPrisma.user.findUnique.mockResolvedValue(MOCK_DB_USER);
  mockRequestDeletion.mockResolvedValue({ success: true, expiresAt: EXPIRES_AT });
  mockRevalidatePath.mockReturnValue(undefined);
  mockHeaders.mockResolvedValue(makeHeadersList());
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("requestDeletionAction - form validation", () => {
  it("returns error when confirmation is not SUPPRIMER", async () => {
    const result = await requestDeletionAction({}, makeFormData("supprimer"));
    expect(result.success).toBeUndefined();
    expect(result.error).toContain("SUPPRIMER");
  });

  it("returns error when confirmation is empty", async () => {
    const result = await requestDeletionAction({}, makeFormData(""));
    expect(result.error).toBeDefined();
  });

  it("does not call requireRequestUser when validation fails", async () => {
    await requestDeletionAction({}, makeFormData("wrong"));
    expect(mockRequireRequestUser).not.toHaveBeenCalled();
  });
});

describe("requestDeletionAction - rate limit", () => {
  it("returns error message when rate limited", async () => {
    mockCheckDeletion.mockResolvedValueOnce(BLOCKED);
    const result = await requestDeletionAction({}, makeFormData("SUPPRIMER"));
    expect(result.error).toContain("Trop de demandes");
    expect(result.error).toContain("1440 minute");
  });

  it("does not call requestDeletion when rate limited", async () => {
    mockCheckDeletion.mockResolvedValueOnce(BLOCKED);
    await requestDeletionAction({}, makeFormData("SUPPRIMER"));
    expect(mockRequestDeletion).not.toHaveBeenCalled();
  });
});

describe("requestDeletionAction - user not found", () => {
  it("returns error when DB user does not exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    const result = await requestDeletionAction({}, makeFormData("SUPPRIMER"));
    expect(result.error).toBe("Utilisateur introuvable.");
  });
});

describe("requestDeletionAction - requestDeletion failure", () => {
  it("returns error when requestDeletion fails", async () => {
    mockRequestDeletion.mockResolvedValueOnce({ success: false, error: "email_failed" });
    const result = await requestDeletionAction({}, makeFormData("SUPPRIMER"));
    expect(result.error).toContain("Erreur lors de l'envoi");
    expect(result.success).toBeUndefined();
  });
});

describe("requestDeletionAction - happy path", () => {
  it("returns { success: true, expiresAt } as ISO string", async () => {
    const result = await requestDeletionAction({}, makeFormData("SUPPRIMER"));
    expect(result.success).toBe(true);
    expect(result.expiresAt).toBe(EXPIRES_AT.toISOString());
  });

  it("calls revalidatePath('/settings/data') on success", async () => {
    await requestDeletionAction({}, makeFormData("SUPPRIMER"));
    expect(mockRevalidatePath).toHaveBeenCalledOnce();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/settings/data");
  });

  it("calls requestDeletion with the correct user and metadata", async () => {
    await requestDeletionAction({}, makeFormData("SUPPRIMER"));
    expect(mockRequestDeletion).toHaveBeenCalledOnce();
    expect(mockRequestDeletion).toHaveBeenCalledWith(
      expect.objectContaining({
        id: MOCK_DB_USER.id,
        email: MOCK_DB_USER.email,
        displayName: MOCK_DB_USER.displayName,
      }),
      expect.objectContaining({ ip: "1.2.3.4", userAgent: "test-agent" }),
    );
  });
});
