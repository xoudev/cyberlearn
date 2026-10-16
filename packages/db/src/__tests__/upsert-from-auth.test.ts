/**
 * The profile a sign-in refreshes, and the avatar it must leave alone.
 *
 * Every sign-in of an account linked to GitHub used to write GitHub's picture
 * over the avatar, so a learner's choice - picked at sign-up or uploaded in
 * the settings - lasted until the next time they signed in. Prisma is mocked:
 * what this checks is what the statements ask for.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { userRepository } from "../repositories/user.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: { upsert: vi.fn(), updateMany: vi.fn() },
    classInvitation: { findMany: vi.fn() },
  },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const ID = "11111111-1111-4111-8111-111111111111";
const GITHUB_PICTURE = "https://avatars.githubusercontent.com/u/1?v=4";

function signIn(avatarUrl: string | null): ReturnType<typeof userRepository.upsertFromAuth> {
  return userRepository.upsertFromAuth({
    id: ID,
    email: "alex@example.fr",
    displayName: "Alex",
    avatarUrl,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.classInvitation.findMany.mockResolvedValue([]);
  mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });
});

describe("upsertFromAuth", () => {
  it("never writes the identity's picture over a refreshed profile", async () => {
    mockPrisma.user.upsert.mockResolvedValue({
      username: "alex",
      role: "STUDENT",
      avatarUrl: "/avatars/av-3.svg",
    });
    await signIn(GITHUB_PICTURE);

    // The mock is untyped; its one argument is the upsert's options.
    const [args] = mockPrisma.user.upsert.mock.calls[0] as [{ update: Record<string, unknown> }];
    expect(args.update).not.toHaveProperty("avatarUrl");
    expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
  });

  it("starts a new profile with the identity's picture", async () => {
    mockPrisma.user.upsert.mockResolvedValue({
      username: null,
      role: "STUDENT",
      avatarUrl: GITHUB_PICTURE,
    });
    await signIn(GITHUB_PICTURE);

    // The mock is untyped; its one argument is the upsert's options.
    const [args] = mockPrisma.user.upsert.mock.calls[0] as [{ create: Record<string, unknown> }];
    expect(args.create).toMatchObject({ avatarUrl: GITHUB_PICTURE });
    expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
  });

  it("fills an avatar that is still empty, and only while it is", async () => {
    mockPrisma.user.upsert.mockResolvedValue({
      username: "alex",
      role: "STUDENT",
      avatarUrl: null,
    });
    await signIn(GITHUB_PICTURE);

    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: ID, avatarUrl: null },
      data: { avatarUrl: GITHUB_PICTURE },
    });
  });

  it("has nothing to fill without a picture", async () => {
    mockPrisma.user.upsert.mockResolvedValue({
      username: "alex",
      role: "STUDENT",
      avatarUrl: null,
    });
    await signIn(null);
    expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
  });

  it("answers with the handle and the role, as before", async () => {
    mockPrisma.user.upsert.mockResolvedValue({
      username: "alex",
      role: "TEACHER",
      avatarUrl: "/avatars/av-3.svg",
    });
    expect(await signIn(GITHUB_PICTURE)).toEqual({ username: "alex", role: "TEACHER" });
  });
});
