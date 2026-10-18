/**
 * Two reads of one account that used to be written where they were needed:
 * the account a console gesture acts on, and the address a signed-in
 * requester's ticket is answered at. Prisma is mocked: what this checks is
 * the row each one asks for and what it answers for an account that is gone.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { userRepository } from "../repositories/user.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { user: { findUnique: vi.fn() } },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const USER = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("userRepository.findConsoleTarget", () => {
  it("reads what the console's gestures need and nothing else", async () => {
    const target = {
      id: USER,
      email: "eleve@exemple.fr",
      displayName: "Élève",
      username: "eleve",
      role: "STUDENT",
    };
    mockPrisma.user.findUnique.mockResolvedValue(target);

    await expect(userRepository.findConsoleTarget(USER)).resolves.toEqual(target);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledExactlyOnceWith({
      where: { id: USER },
      select: { id: true, email: true, displayName: true, username: true, role: true },
    });
  });

  it("answers null for an account that no longer exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(userRepository.findConsoleTarget(USER)).resolves.toBeNull();
  });
});

describe("userRepository.findEmailById", () => {
  it("reads the account's address alone", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ email: "eleve@exemple.fr" });

    await expect(userRepository.findEmailById(USER)).resolves.toBe("eleve@exemple.fr");
    expect(mockPrisma.user.findUnique).toHaveBeenCalledExactlyOnceWith({
      where: { id: USER },
      select: { email: true },
    });
  });

  it("answers null for an account without a profile", async () => {
    // A session can outlive its row, or come before it: the caller falls
    // back on the session's own address.
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(userRepository.findEmailById(USER)).resolves.toBeNull();
  });
});
