import { beforeEach, describe, expect, it, vi } from "vitest";

const { findRoleById } = vi.hoisted(() => ({
  findRoleById: vi.fn<(id: string) => Promise<{ role: string } | null>>(),
}));

vi.mock("@cyberlearn/db", () => ({ userRepository: { findRoleById } }));

const { canDisableOwnMfa } = await import("../mfa-removal");

beforeEach(() => {
  findRoleById.mockReset();
});

describe("canDisableOwnMfa", () => {
  it("reads the caller's role from the database", async () => {
    findRoleById.mockResolvedValue({ role: "STUDENT" });
    await expect(canDisableOwnMfa("user-1")).resolves.toBe(true);
    expect(findRoleById).toHaveBeenCalledWith("user-1");
  });

  it("withholds the control from an administrator", async () => {
    findRoleById.mockResolvedValue({ role: "ADMIN" });
    await expect(canDisableOwnMfa("user-1")).resolves.toBe(false);
  });

  it("offers it to an account without a profile row, which holds no role", async () => {
    findRoleById.mockResolvedValue(null);
    await expect(canDisableOwnMfa("user-1")).resolves.toBe(true);
  });

  it("lets a failed lookup fail rather than guess", async () => {
    findRoleById.mockRejectedValue(new Error("connection reset"));
    await expect(canDisableOwnMfa("user-1")).rejects.toThrow("connection reset");
  });
});
