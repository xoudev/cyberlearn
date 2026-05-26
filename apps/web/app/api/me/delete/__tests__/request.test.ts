/**
 * Unit tests for POST /api/me/delete/request.
 *
 * After the refactor, the route delegates token/email/audit logic to
 * requestDeletion(). Tests here focus on: auth, rate-limit, user lookup,
 * HTTP status mapping for each result variant.
 */

import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("IP_SALT", "delete-request-test-salt-that-is-at-least-32-chars");

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockPrisma, mockSupabase, mockCheckDeletion, mockRequestDeletion } = vi.hoisted(() => {
  const mockPrisma = {
    user: { findUnique: vi.fn() },
  };
  const mockSupabase = { auth: { getUser: vi.fn() } };
  const mockCheckDeletion = vi.fn();
  const mockRequestDeletion = vi.fn();
  return { mockPrisma, mockSupabase, mockCheckDeletion, mockRequestDeletion };
});

vi.mock("@cyberlearn/db", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn().mockResolvedValue(mockSupabase),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkAccountDeletionRequest: mockCheckDeletion,
}));
vi.mock("@/lib/rgpd/request-deletion", () => ({
  requestDeletion: mockRequestDeletion,
}));

// ── Import after mocks ────────────────────────────────────────────────────────

const { NextRequest } = await import("next/server");
const { POST } = await import("../request/route");

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOCK_USER_ID = randomUUID();
const EXPIRES_AT = new Date(Date.now() + 3_600_000);

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
  });
  mockRequestDeletion.mockResolvedValue({ success: true, expiresAt: EXPIRES_AT });
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
  it("returns 202 with a message", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(202);
    const body: unknown = await res.json();
    expect(body).toMatchObject({ message: expect.any(String) as string });
  });

  it("calls requestDeletion with the user's id and metadata", async () => {
    await POST(makeRequest());
    expect(mockRequestDeletion).toHaveBeenCalledOnce();
    expect(mockRequestDeletion).toHaveBeenCalledWith(
      expect.objectContaining({ id: MOCK_USER_ID }),
      expect.objectContaining({
        ip: expect.any(String) as string,
        userAgent: expect.any(String) as string,
      }),
    );
  });
});

describe("POST /api/me/delete/request — requestDeletion failures", () => {
  it("returns 502 when requestDeletion returns email_failed", async () => {
    mockRequestDeletion.mockResolvedValueOnce({ success: false, error: "email_failed" });
    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
    const body: unknown = await res.json();
    expect(body).toMatchObject({ error: "email_failed" });
  });

  it("returns 500 when requestDeletion returns internal", async () => {
    mockRequestDeletion.mockResolvedValueOnce({ success: false, error: "internal" });
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
  });
});

// Re-export helpers for use in sibling test files
export {};
