/**
 * Unit tests for the updatePrivacyAction Server Action.
 *
 * Focus: server-side Zod validation. An invalid leaderboardVisibility must be
 * rejected and must never reach the database — that value drives leaderboard
 * anonymization, so a bad write would be a privacy hole.
 */

import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockRequireRequestUser, mockPrisma, mockRevalidatePath } = vi.hoisted(() => ({
  mockRequireRequestUser: vi.fn(),
  mockPrisma: { userPreferences: { upsert: vi.fn() } },
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireRequestUser: mockRequireRequestUser }));
vi.mock("@cyberlearn/db", () => ({ prisma: mockPrisma }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));

// ── Import after mocks (real Zod schema from @cyberlearn/types runs) ──────────

const { updatePrivacyAction } = await import("../update-privacy");

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOCK_USER = { id: randomUUID() };

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.append(key, value);
  return fd;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockRequireRequestUser.mockResolvedValue(MOCK_USER);
  mockPrisma.userPreferences.upsert.mockResolvedValue({});
  mockRevalidatePath.mockReturnValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("updatePrivacyAction — rejects invalid input", () => {
  it("rejects an arbitrary leaderboardVisibility value and writes nothing", async () => {
    const result = await updatePrivacyAction(
      {},
      makeFormData({ leaderboardVisibility: "ADMIN", publicProfile: "true" }),
    );
    expect(result.error).toBeDefined();
    expect(result.success).toBeUndefined();
    expect(mockPrisma.userPreferences.upsert).not.toHaveBeenCalled();
  });

  it("rejects an empty leaderboardVisibility", async () => {
    const result = await updatePrivacyAction(
      {},
      makeFormData({ leaderboardVisibility: "", publicProfile: "false" }),
    );
    expect(result.error).toBeDefined();
    expect(mockPrisma.userPreferences.upsert).not.toHaveBeenCalled();
  });

  it("rejects a malformed publicProfile (not 'true'/'false')", async () => {
    const result = await updatePrivacyAction(
      {},
      makeFormData({ leaderboardVisibility: "PUBLIC", publicProfile: "yes" }),
    );
    expect(result.error).toBeDefined();
    expect(mockPrisma.userPreferences.upsert).not.toHaveBeenCalled();
  });
});

describe("updatePrivacyAction — happy path", () => {
  it("persists a valid HIDDEN + publicProfile=false via upsert", async () => {
    const result = await updatePrivacyAction(
      {},
      makeFormData({ leaderboardVisibility: "HIDDEN", publicProfile: "false" }),
    );
    expect(result.success).toBe(true);
    expect(mockPrisma.userPreferences.upsert).toHaveBeenCalledOnce();
    expect(mockPrisma.userPreferences.upsert).toHaveBeenCalledWith({
      where: { userId: MOCK_USER.id },
      create: { userId: MOCK_USER.id, leaderboardVisibility: "HIDDEN", publicProfile: false },
      update: { leaderboardVisibility: "HIDDEN", publicProfile: false },
    });
  });

  it("calls requireRequestUser (auth-first)", async () => {
    await updatePrivacyAction(
      {},
      makeFormData({ leaderboardVisibility: "ANONYMOUS", publicProfile: "true" }),
    );
    expect(mockRequireRequestUser).toHaveBeenCalledOnce();
  });
});
