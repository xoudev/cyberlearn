/**
 * Unit tests for updateNotificationsAction - booleans must be well-formed.
 */

import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireRequestUser, mockPrisma, mockRevalidatePath } = vi.hoisted(() => ({
  mockRequireRequestUser: vi.fn(),
  mockPrisma: { userPreferences: { upsert: vi.fn() } },
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireRequestUser: mockRequireRequestUser }));
vi.mock("@cyberlearn/db", () => ({ prisma: mockPrisma }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));

const { updateNotificationsAction } = await import("../update-notifications");

const MOCK_USER = { id: randomUUID() };

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.append(key, value);
  return fd;
}

beforeEach(() => {
  mockRequireRequestUser.mockResolvedValue(MOCK_USER);
  mockPrisma.userPreferences.upsert.mockResolvedValue({});
  mockRevalidatePath.mockReturnValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("updateNotificationsAction", () => {
  it("rejects a malformed boolean and writes nothing", async () => {
    const result = await updateNotificationsAction(
      {},
      makeFormData({ reviewReminders: "yes", weeklyDigest: "false" }),
    );
    expect(result.error).toBeDefined();
    expect(mockPrisma.userPreferences.upsert).not.toHaveBeenCalled();
  });

  it("persists both toggles via upsert", async () => {
    const result = await updateNotificationsAction(
      {},
      makeFormData({ reviewReminders: "true", weeklyDigest: "false" }),
    );
    expect(result.success).toBe(true);
    expect(mockPrisma.userPreferences.upsert).toHaveBeenCalledWith({
      where: { userId: MOCK_USER.id },
      create: { userId: MOCK_USER.id, reviewReminders: true, weeklyDigest: false },
      update: { reviewReminders: true, weeklyDigest: false },
    });
  });
});

describe("updateNotificationsAction - the e-mail notices", () => {
  it("persists the switch for the moderation and class-work e-mails when sent", async () => {
    const result = await updateNotificationsAction(
      {},
      makeFormData({ reviewReminders: "true", weeklyDigest: "true", emailNotifications: "false" }),
    );
    expect(result.success).toBe(true);
    expect(mockPrisma.userPreferences.upsert).toHaveBeenCalledWith({
      where: { userId: MOCK_USER.id },
      create: {
        userId: MOCK_USER.id,
        reviewReminders: true,
        weeklyDigest: true,
        emailNotifications: false,
      },
      update: { reviewReminders: true, weeklyDigest: true, emailNotifications: false },
    });
  });

  it("rejects a malformed value for it", async () => {
    const result = await updateNotificationsAction(
      {},
      makeFormData({ reviewReminders: "true", weeklyDigest: "true", emailNotifications: "yes" }),
    );
    expect(result.error).toBeDefined();
    expect(mockPrisma.userPreferences.upsert).not.toHaveBeenCalled();
  });
});
