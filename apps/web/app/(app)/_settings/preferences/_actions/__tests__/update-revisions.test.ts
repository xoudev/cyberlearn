/**
 * Unit tests for updateRevisionsAction: the spaced-repetition switch takes a
 * strict "true" or "false", writes that one column, and refreshes the pages
 * that read it.
 */

import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireRequestUser, mockSave, mockRevalidatePath } = vi.hoisted(() => ({
  mockRequireRequestUser: vi.fn(),
  mockSave: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireRequestUser: mockRequireRequestUser }));
vi.mock("@cyberlearn/db", () => ({ preferencesRepository: { save: mockSave } }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));

const { updateRevisionsAction } = await import("../update-revisions");

const MOCK_USER = { id: randomUUID() };

function makeFormData(value: string): FormData {
  const fd = new FormData();
  fd.append("spacedRepetition", value);
  return fd;
}

beforeEach(() => {
  mockRequireRequestUser.mockResolvedValue(MOCK_USER);
  mockSave.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("updateRevisionsAction", () => {
  it("rejects anything but true or false, and writes nothing", async () => {
    const result = await updateRevisionsAction({}, makeFormData("on"));
    expect(result.error).toBeDefined();
    expect(mockSave).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ["true", true],
    ["false", false],
  ])("saves %s as that column alone", async (value, spacedRepetition) => {
    const result = await updateRevisionsAction({}, makeFormData(value));
    expect(result.success).toBe(true);
    expect(mockSave).toHaveBeenCalledExactlyOnceWith(MOCK_USER.id, { spacedRepetition });
  });

  it("refreshes every page that reads the switch", async () => {
    await updateRevisionsAction({}, makeFormData("false"));
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
    // /revisions is a redirect to the daily recall since #527: no page to refresh.
    expect(mockRevalidatePath).not.toHaveBeenCalledWith("/revisions");
  });
});
