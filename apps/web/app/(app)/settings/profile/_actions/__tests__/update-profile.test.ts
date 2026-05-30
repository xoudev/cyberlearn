/**
 * Unit tests for updateProfileAction — focus on server-side Zod validation.
 * avatarUrl must be one of the built-in SVG paths; an arbitrary path is rejected
 * and never written.
 */

import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireRequestUser, mockPrisma, mockRevalidatePath } = vi.hoisted(() => ({
  mockRequireRequestUser: vi.fn(),
  mockPrisma: { user: { update: vi.fn() } },
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireRequestUser: mockRequireRequestUser }));
vi.mock("@cyberlearn/db", () => ({ prisma: mockPrisma }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));

const { updateProfileAction } = await import("../update-profile");

const MOCK_USER = { id: randomUUID() };

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.append(key, value);
  return fd;
}

beforeEach(() => {
  mockRequireRequestUser.mockResolvedValue(MOCK_USER);
  mockPrisma.user.update.mockResolvedValue({});
  mockRevalidatePath.mockReturnValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("updateProfileAction — rejects invalid input", () => {
  it("rejects an avatar outside the built-in allowlist and writes nothing", async () => {
    const result = await updateProfileAction(
      {},
      makeFormData({ displayName: "Neo", bio: "", avatarUrl: "/avatars/evil.svg" }),
    );
    expect(result.error).toBeDefined();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects an empty display name", async () => {
    const result = await updateProfileAction(
      {},
      makeFormData({ displayName: "", avatarUrl: "/avatars/av-1.svg" }),
    );
    expect(result.error).toBeDefined();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});

describe("updateProfileAction — happy path", () => {
  it("persists displayName, bio, and avatar", async () => {
    const result = await updateProfileAction(
      {},
      makeFormData({ displayName: "Neo", bio: "Pentester", avatarUrl: "/avatars/av-3.svg" }),
    );
    expect(result.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: MOCK_USER.id },
      data: { displayName: "Neo", bio: "Pentester", avatarUrl: "/avatars/av-3.svg" },
    });
  });

  it("stores an empty bio as null", async () => {
    await updateProfileAction(
      {},
      makeFormData({ displayName: "Neo", bio: "", avatarUrl: "/avatars/av-1.svg" }),
    );
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: MOCK_USER.id },
      data: { displayName: "Neo", bio: null, avatarUrl: "/avatars/av-1.svg" },
    });
  });
});
