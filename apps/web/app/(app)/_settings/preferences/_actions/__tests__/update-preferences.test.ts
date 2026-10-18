/**
 * Unit tests for updateThemeAction - only the three valid themes are accepted.
 */

import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireRequestUser, mockSave } = vi.hoisted(() => ({
  mockRequireRequestUser: vi.fn(),
  mockSave: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireRequestUser: mockRequireRequestUser }));
vi.mock("@cyberlearn/db", () => ({ preferencesRepository: { save: mockSave } }));

const { updateThemeAction } = await import("../update-preferences");

const MOCK_USER = { id: randomUUID() };

function makeFormData(theme: string): FormData {
  const fd = new FormData();
  fd.append("theme", theme);
  return fd;
}

beforeEach(() => {
  mockRequireRequestUser.mockResolvedValue(MOCK_USER);
  mockSave.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("updateThemeAction", () => {
  it("rejects an invalid theme and writes nothing", async () => {
    const result = await updateThemeAction({}, makeFormData("ultra"));
    expect(result.error).toBeDefined();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it.each(["dark", "light", "system"])("accepts the valid theme %s", async (theme) => {
    const result = await updateThemeAction({}, makeFormData(theme));
    expect(result.success).toBe(true);
  });

  it("persists the chosen theme, and only that column", async () => {
    await updateThemeAction({}, makeFormData("light"));
    expect(mockSave).toHaveBeenCalledExactlyOnceWith(MOCK_USER.id, { theme: "light" });
  });
});
