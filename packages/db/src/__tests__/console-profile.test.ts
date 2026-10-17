/**
 * What the console does to an account's sessions and profile: the statement
 * that signs it out everywhere, the corrections to its name, handle, bio and
 * avatar, and the audit row each one writes in its own transaction. Prisma is
 * mocked; that the DELETE reaches auth.sessions is the integration spec's
 * part (console-sessions.integration.test.ts).
 */

import { usernameSchema } from "@cyberlearn/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generatedUsername, userRepository } from "../repositories/user.repository.js";

const { tx, mockPrisma } = vi.hoisted(() => {
  const tx = {
    $executeRaw: vi.fn(),
    user: { findUnique: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    tx,
    mockPrisma: {
      $transaction: vi.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
    },
  };
});

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const TARGET = "11111111-1111-4111-8111-111111111111";
const OTHER = "33333333-3333-4333-8333-333333333333";
const ACTOR = "22222222-2222-4222-8222-222222222222";
const BY = { actorId: ACTOR };

/** The account as the transaction reads it first, then whoever holds a handle. */
function account(over: Record<string, unknown> = {}) {
  return {
    username: "amelie",
    displayName: "Amélie",
    bio: "J'apprends le réseau.",
    avatarUrl: "/avatars/av-2.svg",
    ...over,
  };
}

function audited(): Record<string, unknown> | undefined {
  const [call] = tx.auditLog.create.mock.calls as [[{ data: Record<string, unknown> }]] | [];
  return call?.[0].data;
}

beforeEach(() => {
  vi.clearAllMocks();
  tx.user.update.mockResolvedValue({});
  tx.auditLog.create.mockResolvedValue({});
});

describe("revokeAllSessions", () => {
  it("deletes the account's sessions in auth.sessions and logs how many went", async () => {
    tx.$executeRaw.mockResolvedValue(3);
    await expect(userRepository.revokeAllSessions(TARGET, BY)).resolves.toBe(3);

    // A tagged template: the strings first, then the values.
    const [strings, id] = tx.$executeRaw.mock.calls[0] as [TemplateStringsArray, string];
    expect(strings.join("?")).toBe("DELETE FROM auth.sessions WHERE user_id = ?::uuid");
    expect(id).toBe(TARGET);
    expect(audited()).toEqual({
      actorId: ACTOR,
      action: "admin.user.sessions.revoked",
      targetType: "User",
      targetId: TARGET,
      metadata: { sessionsRevoked: 3 },
    });
  });
});

describe("updateProfileFromConsole", () => {
  const input = { displayName: "Amélie R.", username: "amelie-r", bio: null };

  it("says the account is gone, and writes nothing", async () => {
    tx.user.findUnique.mockResolvedValueOnce(null);
    await expect(userRepository.updateProfileFromConsole(TARGET, input, BY)).resolves.toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it("never takes a handle away from an account that has one", async () => {
    tx.user.findUnique.mockResolvedValueOnce(account());
    const result = await userRepository.updateProfileFromConsole(
      TARGET,
      { ...input, username: null },
      BY,
    );
    expect(result).toEqual({ ok: false, reason: "USERNAME_REQUIRED" });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it("refuses a handle somebody else holds", async () => {
    tx.user.findUnique.mockResolvedValueOnce(account()).mockResolvedValueOnce({ id: OTHER });
    const result = await userRepository.updateProfileFromConsole(TARGET, input, BY);
    expect(result).toEqual({ ok: false, reason: "USERNAME_TAKEN" });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("writes nothing, to the account or the log, when nothing changed", async () => {
    const same = account();
    tx.user.findUnique.mockResolvedValueOnce(same);
    const result = await userRepository.updateProfileFromConsole(
      TARGET,
      { displayName: same.displayName, username: same.username, bio: same.bio },
      BY,
    );
    expect(result).toEqual({ ok: true, changed: [] });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("writes the fields and logs which ones changed, without copying any of them", async () => {
    tx.user.findUnique.mockResolvedValueOnce(account()).mockResolvedValueOnce(null);
    const result = await userRepository.updateProfileFromConsole(TARGET, input, BY);

    expect(result).toEqual({ ok: true, changed: ["displayName", "username", "bio"] });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: TARGET },
      data: { displayName: "Amélie R.", username: "amelie-r", bio: null },
    });
    expect(audited()).toEqual({
      actorId: ACTOR,
      action: "admin.user.profile.update",
      targetType: "User",
      targetId: TARGET,
      metadata: { fields: ["displayName", "username", "bio"] },
    });
    // Names and handles outlive an erasure in the log: none is copied there.
    for (const value of ["réseau", "amelie", "Amélie"]) {
      expect(JSON.stringify(audited())).not.toContain(value);
    }
  });

  it("reads a handle taken in the meantime as taken", async () => {
    tx.user.findUnique.mockResolvedValueOnce(account()).mockResolvedValueOnce(null);
    tx.user.update.mockRejectedValueOnce(Object.assign(new Error("unique"), { code: "P2002" }));
    await expect(userRepository.updateProfileFromConsole(TARGET, input, BY)).resolves.toEqual({
      ok: false,
      reason: "USERNAME_TAKEN",
    });
  });

  it("lets an account still in onboarding stay without a handle", async () => {
    tx.user.findUnique.mockResolvedValueOnce(account({ username: null }));
    const result = await userRepository.updateProfileFromConsole(
      TARGET,
      { displayName: "Nouveau", username: null, bio: null },
      BY,
    );
    expect(result).toEqual({ ok: true, changed: ["displayName", "bio"] });
  });
});

describe("resetProfileFieldFromConsole", () => {
  it("gives the name shown back to the handle", async () => {
    tx.user.findUnique.mockResolvedValueOnce(account({ displayName: "Un nom injurieux" }));
    const result = await userRepository.resetProfileFieldFromConsole(TARGET, "displayName", BY);
    expect(result).toEqual({ ok: true, value: "amelie", clearedAvatar: null });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: TARGET },
      data: { displayName: "amelie" },
    });
    expect(audited()).toMatchObject({
      action: "admin.user.profile.reset",
      metadata: { field: "displayName" },
    });
    expect(JSON.stringify(audited())).not.toContain("injurieux");
  });

  it("refuses a name or a handle reset on an account that has no handle yet", async () => {
    tx.user.findUnique.mockResolvedValue(account({ username: null }));
    for (const field of ["displayName", "username"] as const) {
      await expect(userRepository.resetProfileFieldFromConsole(TARGET, field, BY)).resolves.toEqual(
        { ok: false, reason: "NO_USERNAME" },
      );
    }
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it("generates a free handle, passing over the ones already taken", async () => {
    const names = ["utilisateur-aaaaaaaa", "utilisateur-bbbbbbbb"];
    tx.user.findUnique
      .mockResolvedValueOnce(account())
      .mockResolvedValueOnce({ id: OTHER })
      .mockResolvedValueOnce(null);
    const result = await userRepository.resetProfileFieldFromConsole(
      TARGET,
      "username",
      BY,
      () => names.shift() ?? "",
    );
    expect(result).toEqual({ ok: true, value: "utilisateur-bbbbbbbb", clearedAvatar: null });
    expect(audited()).toMatchObject({ metadata: { field: "username" } });
    expect(JSON.stringify(audited())).not.toContain("amelie");
  });

  it("gives up after a few taken handles rather than loop", async () => {
    tx.user.findUnique.mockResolvedValueOnce(account()).mockResolvedValue({ id: OTHER });
    const result = await userRepository.resetProfileFieldFromConsole(
      TARGET,
      "username",
      BY,
      () => "utilisateur-cccccccc",
    );
    expect(result).toEqual({ ok: false, reason: "USERNAME_TAKEN" });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it("clears the avatar and hands back what it held, for its file to go", async () => {
    tx.user.findUnique.mockResolvedValueOnce(account({ avatarUrl: `__upload:${TARGET}/a.png` }));
    const result = await userRepository.resetProfileFieldFromConsole(TARGET, "avatar", BY);
    expect(result).toEqual({ ok: true, value: null, clearedAvatar: `__upload:${TARGET}/a.png` });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: TARGET },
      data: { avatarUrl: null },
    });
    // The storage key names the account's folder and the file: not logged.
    expect(audited()).toMatchObject({ metadata: { field: "avatar" } });
    expect(JSON.stringify(audited())).not.toContain("__upload");
  });

  it("clears the bio, and says when there was none to clear", async () => {
    tx.user.findUnique.mockResolvedValueOnce(account());
    await expect(userRepository.resetProfileFieldFromConsole(TARGET, "bio", BY)).resolves.toEqual({
      ok: true,
      value: null,
      clearedAvatar: null,
    });

    tx.user.findUnique.mockResolvedValueOnce(account({ bio: null }));
    await expect(userRepository.resetProfileFieldFromConsole(TARGET, "bio", BY)).resolves.toEqual({
      ok: false,
      reason: "UNCHANGED",
    });
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
  });
});

describe("generatedUsername", () => {
  it("is a handle the site's own rules accept", () => {
    for (let i = 0; i < 20; i++) {
      const name = generatedUsername();
      expect(name).toMatch(/^utilisateur-[0-9a-f]{8}$/u);
      expect(usernameSchema.safeParse(name).success).toBe(true);
    }
  });
});
