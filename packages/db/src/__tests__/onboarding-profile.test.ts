/**
 * What the sign-up steps read and write of the account
 * (apps/web/lib/onboarding/steps.ts and its pages). Prisma is mocked: what this
 * checks is what the statements ask for.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { userRepository } from "../repositories/user.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    userPreferences: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.user.update.mockImplementation((args: unknown) => ({ op: "update", args }));
  mockPrisma.userPreferences.upsert.mockImplementation((args: unknown) => ({
    op: "upsert",
    args,
  }));
  mockPrisma.$transaction.mockResolvedValue([]);
});

describe("the account as the sign-up reads it", () => {
  it("selects the handle, the name, the bio and the avatar, and no more", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      username: null,
      displayName: "Alex",
      bio: null,
      avatarUrl: null,
    });
    await userRepository.findOnboardingProfile("user-1");
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { username: true, displayName: true, bio: true, avatarUrl: true },
    });
  });

  it("answers null for an account that does not exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    expect(await userRepository.findOnboardingProfile("ghost")).toBeNull();
  });

  it("finds who holds a handle, by the handle alone", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: "user-2" });
    expect(await userRepository.findIdByUsername("alex")).toBe("user-2");
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { username: "alex" },
      select: { id: true },
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    expect(await userRepository.findIdByUsername("free")).toBeNull();
  });
});

describe("the first step's write", () => {
  it("writes the handle, the name and the bio, and makes sure preferences exist, together", async () => {
    await userRepository.saveOnboardingProfile("user-1", {
      username: "alex-b",
      displayName: "Alex",
      bio: "Réseaux.",
    });

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { username: "alex-b", displayName: "Alex", bio: "Réseaux." },
    });
    expect(mockPrisma.userPreferences.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: { userId: "user-1" },
      update: {},
    });
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.$transaction.mock.calls[0]?.[0]).toHaveLength(2);
  });

  it("lets the unique-constraint error through, for the service to say the handle is taken", async () => {
    const duplicate = Object.assign(new Error("unique"), { code: "P2002" });
    mockPrisma.$transaction.mockRejectedValue(duplicate);
    await expect(
      userRepository.saveOnboardingProfile("user-1", {
        username: "alex",
        displayName: "A",
        bio: null,
      }),
    ).rejects.toBe(duplicate);
  });
});

describe("the second step's write", () => {
  it("keeps the avatar picked, and touches nothing else", async () => {
    await userRepository.setAvatarUrl("user-1", "/avatars/av-3.svg");
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { avatarUrl: "/avatars/av-3.svg" },
    });
  });
});
