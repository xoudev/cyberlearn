/**
 * Unit tests for /api/me/delete/confirm (GET shows the confirmation page,
 * POST performs the irreversible deletion).
 *
 * All external I/O (Prisma, deleteAccount, Supabase admin, Supabase signOut) is mocked.
 * Response assertions use the Location header since the handler redirects.
 */

import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("IP_SALT", "delete-confirm-test-salt-that-is-at-least-32-chars");

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockPrisma, mockDeleteAccount, mockAuthDeleteUser, mockSignOut, mockCookieStore } =
  vi.hoisted(() => {
    const mockPrisma = {
      accountDeletionToken: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      auditLog: { create: vi.fn() },
    };
    const mockDeleteAccount = vi.fn();
    const mockAuthDeleteUser = vi.fn();
    const mockSignOut = vi.fn();
    const mockCookieStore = { getAll: vi.fn().mockReturnValue([]), set: vi.fn() };
    return { mockPrisma, mockDeleteAccount, mockAuthDeleteUser, mockSignOut, mockCookieStore };
  });

vi.mock("@cyberlearn/db", () => ({ prisma: mockPrisma }));
vi.mock("@cyberlearn/db/supabase/server", () => ({
  createSupabaseServerClient: vi.fn().mockReturnValue({ auth: { signOut: mockSignOut } }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn().mockReturnValue({
    auth: { admin: { deleteUser: mockAuthDeleteUser } },
  }),
}));
vi.mock("@/lib/rgpd/delete-account", () => ({ deleteAccount: mockDeleteAccount }));
vi.mock("next/headers", () => ({ cookies: vi.fn().mockResolvedValue(mockCookieStore) }));

// ── Import after mocks ────────────────────────────────────────────────────────

const { NextRequest } = await import("next/server");
const { GET, POST } = await import("../confirm/route");

// ── Typed matcher helpers ─────────────────────────────────────────────────────

function containing<T extends Record<string, unknown>>(sample: T): T {
  // SAFETY: T satisfies DeeplyAllowMatchers<T> at runtime; `never` bypasses the
  // structural mismatch between T and Vitest's widened DeeplyAllowMatchers<T>.
  return expect.objectContaining(sample as never) as unknown as T;
}

function anyStr(): string {
  // SAFETY: expect.any(String) is a Vitest asymmetric matcher that matches any string.
  return expect.any(String) as unknown as string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_USER_ID = randomUUID();
const VALID_PLAIN_TOKEN = "a".repeat(43);

function makeRequest(token?: string): InstanceType<typeof NextRequest> {
  const url = token
    ? `http://localhost/api/me/delete/confirm?token=${token}`
    : "http://localhost/api/me/delete/confirm";
  return new NextRequest(url, { method: "POST" });
}

function redirectLocation(res: Response): string {
  return res.headers.get("location") ?? "";
}

const FUTURE = new Date(Date.now() + 3_600_000);
const PAST = new Date(Date.now() - 1_000);

const VALID_RECORD = { id: "tok-1", userId: MOCK_USER_ID, expiresAt: FUTURE, usedAt: null };

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockPrisma.accountDeletionToken.findUnique.mockResolvedValue(VALID_RECORD);
  mockPrisma.accountDeletionToken.update.mockResolvedValue({});
  mockPrisma.auditLog.create.mockResolvedValue({});
  mockDeleteAccount.mockResolvedValue({
    hashedUserId: "abc",
    deletedAt: new Date(),
    certificatesAnonymized: 0,
    questionsAnonymized: 0,
    answersAnonymized: 0,
    ratingsAnonymized: 0,
    contactTicketsAnonymized: 0,
    auditLogsAnonymized: 0,
  });
  mockAuthDeleteUser.mockResolvedValue({ error: null });
  mockSignOut.mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/me/delete/confirm - missing token", () => {
  it("redirects to error?reason=missing when no token param", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(303);
    expect(redirectLocation(res)).toContain("reason=missing");
  });
});

describe("POST /api/me/delete/confirm - invalid token", () => {
  it("redirects to error?reason=invalid when token has invalid chars", async () => {
    const res = await POST(makeRequest("../../etc/passwd"));
    expect(res.status).toBe(303);
    expect(redirectLocation(res)).toContain("reason=invalid");
  });

  it("redirects to error?reason=invalid when token not found in DB", async () => {
    mockPrisma.accountDeletionToken.findUnique.mockResolvedValueOnce(null);
    const res = await POST(makeRequest(VALID_PLAIN_TOKEN));
    expect(res.status).toBe(303);
    expect(redirectLocation(res)).toContain("reason=invalid");
  });
});

describe("POST /api/me/delete/confirm - expired token", () => {
  it("redirects to error?reason=expired when token is past expiresAt", async () => {
    mockPrisma.accountDeletionToken.findUnique.mockResolvedValueOnce({
      ...VALID_RECORD,
      expiresAt: PAST,
    });
    const res = await POST(makeRequest(VALID_PLAIN_TOKEN));
    expect(res.status).toBe(303);
    expect(redirectLocation(res)).toContain("reason=expired");
  });
});

describe("POST /api/me/delete/confirm - already used token", () => {
  it("redirects to error?reason=used when token has usedAt set", async () => {
    mockPrisma.accountDeletionToken.findUnique.mockResolvedValueOnce({
      ...VALID_RECORD,
      usedAt: new Date(Date.now() - 60_000),
    });
    const res = await POST(makeRequest(VALID_PLAIN_TOKEN));
    expect(res.status).toBe(303);
    expect(redirectLocation(res)).toContain("reason=used");
  });
});

describe("POST /api/me/delete/confirm - happy path", () => {
  it("marks the token as used before calling deleteAccount", async () => {
    await POST(makeRequest(VALID_PLAIN_TOKEN));
    expect(mockPrisma.accountDeletionToken.update).toHaveBeenCalledWith(
      containing({
        where: { id: "tok-1" },
        data: containing({ usedAt: expect.any(Date) as unknown as Date }),
      }),
    );
    // Ordering: update must fire before deleteAccount
    const updateOrder = mockPrisma.accountDeletionToken.update.mock.invocationCallOrder[0] ?? 0;
    const deleteOrder = mockDeleteAccount.mock.invocationCallOrder[0] ?? 0;
    expect(updateOrder).toBeLessThan(deleteOrder);
  });

  it("calls deleteAccount with the userId from the token", async () => {
    await POST(makeRequest(VALID_PLAIN_TOKEN));
    expect(mockDeleteAccount).toHaveBeenCalledOnce();
    expect(mockDeleteAccount).toHaveBeenCalledWith(
      MOCK_USER_ID,
      containing({ ip: anyStr(), userAgent: anyStr() }),
    );
  });

  it("calls supabaseAdmin.auth.admin.deleteUser after deleteAccount", async () => {
    await POST(makeRequest(VALID_PLAIN_TOKEN));
    expect(mockAuthDeleteUser).toHaveBeenCalledOnce();
    expect(mockAuthDeleteUser).toHaveBeenCalledWith(MOCK_USER_ID);
    // deleteAccount must fire before auth delete
    const appDeleteOrder = mockDeleteAccount.mock.invocationCallOrder[0] ?? 0;
    const authDeleteOrder = mockAuthDeleteUser.mock.invocationCallOrder[0] ?? 0;
    expect(appDeleteOrder).toBeLessThan(authDeleteOrder);
  });

  it("calls signOut to clear the session", async () => {
    await POST(makeRequest(VALID_PLAIN_TOKEN));
    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  it("redirects to /account/delete/success", async () => {
    const res = await POST(makeRequest(VALID_PLAIN_TOKEN));
    expect(res.status).toBe(303);
    expect(redirectLocation(res)).toContain("/account/delete/success");
  });
});

describe("POST /api/me/delete/confirm - deleteAccount failure", () => {
  it("redirects to error?reason=internal when deleteAccount throws", async () => {
    mockDeleteAccount.mockRejectedValueOnce(new Error("DB exploded"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation((): void => undefined);

    const res = await POST(makeRequest(VALID_PLAIN_TOKEN));
    expect(res.status).toBe(303);
    expect(redirectLocation(res)).toContain("reason=internal");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[delete/confirm] deleteAccount failed:",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });
});

describe("POST /api/me/delete/confirm - auth deletion failure", () => {
  it("redirects to error?reason=auth_cleanup_failed when Supabase Auth delete fails", async () => {
    mockAuthDeleteUser.mockResolvedValueOnce({
      error: { message: "user not found in auth", status: 404 },
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation((): void => undefined);

    const res = await POST(makeRequest(VALID_PLAIN_TOKEN));
    expect(res.status).toBe(303);
    expect(redirectLocation(res)).toContain("reason=auth_cleanup_failed");

    consoleSpy.mockRestore();
  });

  it("creates an audit log entry when auth delete fails", async () => {
    mockAuthDeleteUser.mockResolvedValueOnce({
      error: { message: "upstream timeout", status: 503 },
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation((): void => undefined);

    await POST(makeRequest(VALID_PLAIN_TOKEN));

    expect(mockPrisma.auditLog.create).toHaveBeenCalledOnce();
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      containing({
        data: containing({
          action: "user.account.auth_delete_failed",
          anonymized: true,
          actorId: null,
        }),
      }),
    );

    consoleSpy.mockRestore();
  });

  it("does not call signOut when auth delete fails (session already invalidated)", async () => {
    mockAuthDeleteUser.mockResolvedValueOnce({
      error: { message: "auth error", status: 500 },
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation((): void => undefined);

    await POST(makeRequest(VALID_PLAIN_TOKEN));
    expect(mockSignOut).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

// A link click must never delete: mail scanners and prefetchers follow links.
describe("GET /api/me/delete/confirm - never destructive", () => {
  it("redirects to the confirmation page without touching the account", () => {
    const req = new NextRequest(
      `http://localhost/api/me/delete/confirm?token=${VALID_PLAIN_TOKEN}`,
      { method: "GET" },
    );
    const res = GET(req);
    expect(redirectLocation(res)).toContain("/account/delete/confirm");
    expect(mockPrisma.accountDeletionToken.update).not.toHaveBeenCalled();
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });
});
