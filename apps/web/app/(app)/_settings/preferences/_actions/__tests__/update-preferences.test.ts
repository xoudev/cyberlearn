/**
 * Unit tests for updateThemeAction - only the three valid themes are accepted.
 */

import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireRequestUser, mockPrisma } = vi.hoisted(() => ({
  mockRequireRequestUser: vi.fn(),
  mockPrisma: { userPreferences: { upsert: vi.fn() } },
}));

vi.mock("@/lib/auth", () => ({ requireRequestUser: mockRequireRequestUser }));
vi.mock("@cyberlearn/db", () => ({ prisma: mockPrisma }));

const { updateThemeAction } = await import("../update-preferences");

const MOCK_USER = { id: randomUUID() };

function makeFormData(theme: string): FormData {
  const fd = new FormData();
  fd.append("theme", theme);
  return fd;
}

beforeEach(() => {
  mockRequireRequestUser.mockResolvedValue(MOCK_USER);
  mockPrisma.userPreferences.upsert.mockResolvedValue({});
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("updateThemeAction", () => {
  it("rejects an invalid theme and writes nothing", async () => {
    const result = await updateThemeAction({}, makeFormData("ultra"));
    expect(result.error).toBeDefined();
    expect(mockPrisma.userPreferences.upsert).not.toHaveBeenCalled();
  });

  it.each(["dark", "light", "system"])("accepts the valid theme %s", async (theme) => {
    const result = await updateThemeAction({}, makeFormData(theme));
    expect(result.success).toBe(true);
  });

  it("persists the chosen theme via upsert", async () => {
    await updateThemeAction({}, makeFormData("light"));
    expect(mockPrisma.userPreferences.upsert).toHaveBeenCalledWith({
      where: { userId: MOCK_USER.id },
      create: { userId: MOCK_USER.id, theme: "light" },
      update: { theme: "light" },
    });
  });
});
