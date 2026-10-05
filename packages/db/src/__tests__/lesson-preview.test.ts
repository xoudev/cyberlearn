/**
 * The editor's previews: a token the database never sees in clear, refreshed
 * by its author alone, served while it has not expired. Prisma is mocked; the
 * RLS of the table is covered by the integration suite's coverage assertion.
 */

import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LESSON_PREVIEW_TOKEN,
  LESSON_PREVIEW_TTL_MS,
  lessonPreviewRepository,
} from "../repositories/lesson-preview.repository.js";

// Hoisted above the import: the repository reads the mocked client.
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    lessonPreview: { create: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn() },
  },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const NOW = new Date("2026-10-05T12:00:00.000Z");
const LATER = new Date(NOW.getTime() + LESSON_PREVIEW_TTL_MS);
const USER = "11111111-1111-4111-8111-111111111111";

function sha256(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.lessonPreview.create.mockResolvedValue({});
});

describe("issue", () => {
  it("stores the draft under the hash of a fresh token, for half an hour", async () => {
    const token = await lessonPreviewRepository.issue(USER, "## un", NOW);
    expect(token).toMatch(LESSON_PREVIEW_TOKEN);
    expect(mockPrisma.lessonPreview.create).toHaveBeenCalledWith({
      data: { userId: USER, tokenHash: sha256(token), contentMdx: "## un", expiresAt: LATER },
    });
  });

  it("never hands out the same token twice", async () => {
    const a = await lessonPreviewRepository.issue(USER, "a", NOW);
    const b = await lessonPreviewRepository.issue(USER, "b", NOW);
    expect(a).not.toBe(b);
  });
});

describe("refresh", () => {
  const TOKEN = "A".repeat(43);

  it("replaces the author's draft and gives it another half hour", async () => {
    mockPrisma.lessonPreview.updateMany.mockResolvedValue({ count: 1 });
    await expect(lessonPreviewRepository.refresh(USER, TOKEN, "## deux", NOW)).resolves.toBe(true);
    expect(mockPrisma.lessonPreview.updateMany).toHaveBeenCalledWith({
      where: { tokenHash: sha256(TOKEN), userId: USER },
      data: { contentMdx: "## deux", expiresAt: LATER },
    });
  });

  it("refuses a token that is not this author's, or no longer exists", async () => {
    mockPrisma.lessonPreview.updateMany.mockResolvedValue({ count: 0 });
    await expect(lessonPreviewRepository.refresh(USER, TOKEN, "x", NOW)).resolves.toBe(false);
  });

  it("does not even ask the database about a token of the wrong shape", async () => {
    await expect(lessonPreviewRepository.refresh(USER, "short", "x", NOW)).resolves.toBe(false);
    await expect(lessonPreviewRepository.refresh(USER, `${TOKEN}=`, "x", NOW)).resolves.toBe(false);
    expect(mockPrisma.lessonPreview.updateMany).not.toHaveBeenCalled();
  });
});

describe("findLive", () => {
  const TOKEN = "b".repeat(43);

  it("reads the draft behind a token that has not expired", async () => {
    mockPrisma.lessonPreview.findFirst.mockResolvedValue({ contentMdx: "## un" });
    await expect(lessonPreviewRepository.findLive(TOKEN, NOW)).resolves.toEqual({
      contentMdx: "## un",
    });
    expect(mockPrisma.lessonPreview.findFirst).toHaveBeenCalledWith({
      where: { tokenHash: sha256(TOKEN), expiresAt: { gt: NOW } },
      select: { contentMdx: true },
    });
  });

  it("answers null for a token of the wrong shape, without a query", async () => {
    await expect(lessonPreviewRepository.findLive("nope", NOW)).resolves.toBeNull();
    expect(mockPrisma.lessonPreview.findFirst).not.toHaveBeenCalled();
  });
});
