/**
 * Unit tests for POST /api/me/delete/request.
 *
 * All external I/O (Prisma, Supabase, Resend, rate-limit) is mocked.
 * Assertions focus on: response codes, token never leaking, audit trail shape.
 */

import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("IP_SALT", "delete-request-test-salt-that-is-at-least-32-chars");

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockPrisma, mockSupabase, mockSendDeletionConfirmEmail, mockCheckDeletion } = vi.hoisted(
  () => {
    const mockPrisma = {
      user: { findUnique: vi.fn() },
      accountDeletionToken: { create: vi.fn() },
      auditLog: { create: vi.fn() },
    };
    const mockSupabase = { auth: { getUser: vi.fn() } };
    const mockSendDeletionConfirmEmail = vi.fn();
    const mockCheckDeletion = vi.fn();
    return { mockPrisma, mockSupabase, mockSendDeletionConfirmEmail, mockCheckDeletion };
  },
);

vi.mock("@cyberlearn/db", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn().mockResolvedValue(mockSupabase),
}));
vi.mock("@cyberlearn/email", () => ({
  sendDeletionConfirmEmail: mockSendDeletionConfirmEmail,
}));
vi.mock("@/lib/rate-limit", () => ({
  checkAccountDeletionRequest: mockCheckDeletion,
}));
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: "https://cyberlearn.app",
    RESEND_API_KEY: "re_test",
    RESEND_FROM_EMAIL: "noreply@cyberlearn.app",
  },
}));

// ── Import after mocks ────────────────────────────────────────────────────────

const { NextRequest } = await import("next/server");
const { POST } = await import("../request/route");

// ── Typed matcher helpers ─────────────────────────────────────────────────────
// expect.objectContaining() / expect.any() return `any` — these wrappers preserve
// the declared type so no-unsafe-assignment doesn't fire on property assignments.

function containing<T extends Record<string, unknown>>(sample: T): T {
  // SAFETY: T satisfies DeeplyAllowMatchers<T> at runtime; `never` bypasses the
  // structural mismatch between T and Vitest's widened DeeplyAllowMatchers<T>.
  return expect.objectContaining(sample as never) as unknown as T;
}

function anyStr(): string {
  // SAFETY: expect.any(String) is a Vitest asymmetric matcher that matches any
  // string at runtime; cast via unknown to avoid no-unsafe-assignment on callers.
  return expect.any(String) as unknown as string;
}

function anyDate(): Date {
  return expect.any(Date) as unknown as Date;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_USER_ID = randomUUID();

const PASS = { success: true, limit: 3, remaining: 2, reset: 0, retryAfterSeconds: 0 };
const BLOCKED = {
  success: false,
  limit: 3,
  remaining: 0,
  reset: Date.now() + 86_400_000,
  retryAfterSeconds: 86400,
};

function makeRequest(): InstanceType<typeof NextRequest> {
  return new NextRequest("http://localhost/api/me/delete/request", { method: "POST" });
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } });
  mockCheckDeletion.mockResolvedValue(PASS);
  mockPrisma.user.findUnique.mockResolvedValue({
    email: "user@example.com",
    displayName: "Alice",
    username: "alice",
  });
  mockPrisma.accountDeletionToken.create.mockResolvedValue({});
  mockPrisma.auditLog.create.mockResolvedValue({});
  mockSendDeletionConfirmEmail.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/me/delete/request — auth", () => {
  it("returns 401 when user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    const body: unknown = await res.json();
    expect(body).toMatchObject({ error: "unauthorized" });
  });
});

describe("POST /api/me/delete/request — rate limit", () => {
  it("returns 429 with Retry-After when rate limit exceeded", async () => {
    mockCheckDeletion.mockResolvedValueOnce(BLOCKED);
    const res = await POST(makeRequest());
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("86400");
    const body: unknown = await res.json();
    expect(body).toMatchObject({ error: "rate_limited" });
  });

  it("blocks the 4th request", async () => {
    for (let i = 0; i < 3; i++) {
      mockCheckDeletion.mockResolvedValueOnce(PASS);
      await POST(makeRequest());
    }
    mockCheckDeletion.mockResolvedValueOnce(BLOCKED);
    const res = await POST(makeRequest());
    expect(res.status).toBe(429);
  });
});

describe("POST /api/me/delete/request — user not found", () => {
  it("returns 404 when DB user does not exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
    const body: unknown = await res.json();
    expect(body).toMatchObject({ error: "not_found" });
  });
});

describe("POST /api/me/delete/request — happy path", () => {
  it("returns 202 with a short message", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(202);
    const body: unknown = await res.json();
    expect(body).toMatchObject({ message: anyStr() });
  });

  it("creates an AccountDeletionToken with a SHA-256 hash (not the plain token)", async () => {
    await POST(makeRequest());
    expect(mockPrisma.accountDeletionToken.create).toHaveBeenCalledOnce();
    expect(mockPrisma.accountDeletionToken.create).toHaveBeenCalledWith(
      containing({
        data: containing({
          userId: MOCK_USER_ID,
          tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/) as string,
          expiresAt: anyDate(),
        }),
      }),
    );
  });

  it("sends the confirmation email to the DB user's email", async () => {
    await POST(makeRequest());
    expect(mockSendDeletionConfirmEmail).toHaveBeenCalledOnce();
    expect(mockSendDeletionConfirmEmail).toHaveBeenCalledWith(
      containing({
        to: "user@example.com",
        displayName: "Alice",
        confirmUrl: expect.stringContaining(
          "https://cyberlearn.app/account/delete/confirm?token=",
        ) as string,
      }),
    );
  });

  it("creates an audit log entry with the correct action", async () => {
    await POST(makeRequest());
    expect(mockPrisma.auditLog.create).toHaveBeenCalledOnce();
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      containing({
        data: containing({
          actorId: MOCK_USER_ID,
          action: "user.account.deletion_requested",
          targetId: MOCK_USER_ID,
          // IP must be pseudonymized (64-char hex), not raw
          ipAddress: expect.stringMatching(/^[0-9a-f]{64}$/) as string,
        }),
      }),
    );
  });

  it("never returns the plain token in the response body", async () => {
    const res = await POST(makeRequest());
    const raw = await res.text();
    // plain token is base64url (43 chars of [A-Za-z0-9_-])
    expect(raw).not.toMatch(/[A-Za-z0-9_-]{43}/);
  });

  it("uses displayName (always non-null) as the email greeting", async () => {
    await POST(makeRequest());
    expect(mockSendDeletionConfirmEmail).toHaveBeenCalledWith(containing({ displayName: "Alice" }));
  });
});

// Re-export helpers for use in sibling test files
export { anyStr };
