import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn<() => Promise<{ id: string }>>(),
  updateProfileFromConsole: vi.fn(),
  resetProfileFieldFromConsole: vi.fn(),
  remove: vi.fn<(keys: string[]) => Promise<{ error: { message: string } | null }>>(),
  from: vi.fn<(bucket: string) => unknown>(),
  revalidatePath: vi.fn<(path: string) => void>(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  userRepository: {
    updateProfileFromConsole: m.updateProfileFromConsole,
    resetProfileFieldFromConsole: m.resetProfileFieldFromConsole,
  },
}));
vi.mock("@cyberlearn/db/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({ storage: { from: m.from } }),
}));
vi.mock("@cyberlearn/lib/logger", () => ({
  logger: { error: vi.fn() },
  errorMessage: (error: unknown) => String(error),
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));

const { resetUserProfileFieldAction, updateUserProfileAction } = await import("../profile-actions");

/**
 * Correcting an account's name, handle, bio and avatar from its page: the
 * site's own bounds, the refusals in words, and the uploaded picture's file
 * removed once the row no longer points at it.
 */

const ADMIN = "11111111-1111-4111-8111-111111111111";
const TARGET = "22222222-2222-4222-8222-222222222222";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

const PROFILE = { userId: TARGET, displayName: "Amélie", username: "amelie", bio: "" };

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: ADMIN });
  m.updateProfileFromConsole.mockResolvedValue({ ok: true, changed: ["displayName"] });
  m.resetProfileFieldFromConsole.mockResolvedValue({ ok: true, value: null, clearedAvatar: null });
  m.remove.mockResolvedValue({ error: null });
  m.from.mockReturnValue({ remove: m.remove });
});

describe("updateUserProfileAction", () => {
  it("checks the caller is an admin before anything else", async () => {
    m.requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(updateUserProfileAction({}, form(PROFILE))).rejects.toThrow("NEXT_REDIRECT");
    expect(m.updateProfileFromConsole).not.toHaveBeenCalled();
  });

  it("writes the trimmed fields as the administrator, an empty bio as none", async () => {
    const result = await updateUserProfileAction(
      {},
      form({ ...PROFILE, displayName: "  Amélie R. ", bio: "   " }),
    );
    expect(m.updateProfileFromConsole).toHaveBeenCalledWith(
      TARGET,
      { displayName: "Amélie R.", username: "amelie", bio: null },
      { actorId: ADMIN },
    );
    expect(result).toEqual({ ok: true, notice: "Profil enregistré (nom affiché)." });
    expect(m.revalidatePath).toHaveBeenCalledWith(`/users/${TARGET}`);
  });

  it("says the old profile address goes with a new handle", async () => {
    m.updateProfileFromConsole.mockResolvedValue({ ok: true, changed: ["username"] });
    const result = await updateUserProfileAction({}, form({ ...PROFILE, username: "amelie-r" }));
    expect(result.notice).toMatch(/l'ancienne ne mène plus à ce compte/u);
  });

  it.each([
    ["a name left empty", { displayName: " " }, /nom affiché/u],
    ["a name past 64 characters", { displayName: "a".repeat(65) }, /64 caractères/u],
    ["a handle the site refuses", { username: "Amélie!" }, /3 à 32 caractères/u],
    ["a bio past 280 characters", { bio: "b".repeat(281) }, /280 caractères/u],
  ])("refuses %s, in French, and writes nothing", async (_, over, message) => {
    const result = await updateUserProfileAction({}, form({ ...PROFILE, ...over }));
    expect(result.error).toMatch(message);
    expect(m.updateProfileFromConsole).not.toHaveBeenCalled();
  });

  it("hands an empty handle on as none, for the repository to judge", async () => {
    await updateUserProfileAction({}, form({ ...PROFILE, username: "" }));
    expect(m.updateProfileFromConsole).toHaveBeenCalledWith(
      TARGET,
      expect.objectContaining({ username: null }),
      { actorId: ADMIN },
    );
  });

  it.each([
    ["NOT_FOUND", "Ce compte n'existe plus."],
    ["USERNAME_TAKEN", "Ce pseudo est déjà pris par un autre compte."],
  ])("says why the repository refused (%s)", async (reason, message) => {
    m.updateProfileFromConsole.mockResolvedValue({ ok: false, reason });
    expect((await updateUserProfileAction({}, form(PROFILE))).error).toBe(message);
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("says nothing changed, and refreshes nothing", async () => {
    m.updateProfileFromConsole.mockResolvedValue({ ok: true, changed: [] });
    expect(await updateUserProfileAction({}, form(PROFILE))).toEqual({
      ok: true,
      notice: "Rien n'a changé.",
    });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("reports a failed write as nothing changed", async () => {
    m.updateProfileFromConsole.mockRejectedValue(new Error("db down"));
    expect((await updateUserProfileAction({}, form(PROFILE))).error).toMatch(
      /Rien n'a été modifié/u,
    );
  });
});

describe("resetUserProfileFieldAction", () => {
  it("refuses a field it does not know", async () => {
    const result = await resetUserProfileFieldAction({}, form({ userId: TARGET, field: "email" }));
    expect(result.error).toBe("Paramètres invalides.");
    expect(m.resetProfileFieldFromConsole).not.toHaveBeenCalled();
  });

  it("names the generated handle", async () => {
    m.resetProfileFieldFromConsole.mockResolvedValue({
      ok: true,
      value: "utilisateur-1a2b3c4d",
      clearedAvatar: null,
    });
    const result = await resetUserProfileFieldAction(
      {},
      form({ userId: TARGET, field: "username" }),
    );
    expect(m.resetProfileFieldFromConsole).toHaveBeenCalledWith(TARGET, "username", {
      actorId: ADMIN,
    });
    expect(result.notice).toMatch(/^Nouveau pseudo : @utilisateur-1a2b3c4d\./u);
  });

  it("removes an uploaded picture's file once the avatar is cleared", async () => {
    m.resetProfileFieldFromConsole.mockResolvedValue({
      ok: true,
      value: null,
      clearedAvatar: `__upload:${TARGET}/photo.webp`,
    });
    const result = await resetUserProfileFieldAction({}, form({ userId: TARGET, field: "avatar" }));
    expect(m.from).toHaveBeenCalledWith("avatars");
    expect(m.remove).toHaveBeenCalledWith([`${TARGET}/photo.webp`]);
    expect(result).toMatchObject({ ok: true, fileKept: false });
  });

  it("touches no storage for a built-in avatar", async () => {
    m.resetProfileFieldFromConsole.mockResolvedValue({
      ok: true,
      value: null,
      clearedAvatar: "/avatars/av-3.svg",
    });
    await resetUserProfileFieldAction({}, form({ userId: TARGET, field: "avatar" }));
    expect(m.remove).not.toHaveBeenCalled();
  });

  it("says so when the file stayed in storage, with the avatar cleared all the same", async () => {
    m.resetProfileFieldFromConsole.mockResolvedValue({
      ok: true,
      value: null,
      clearedAvatar: `__upload:${TARGET}/photo.webp`,
    });
    m.remove.mockResolvedValue({ error: { message: "storage down" } });
    const result = await resetUserProfileFieldAction({}, form({ userId: TARGET, field: "avatar" }));
    expect(result).toMatchObject({ ok: true, fileKept: true });
  });

  it.each([
    ["UNCHANGED", "bio", "Ce compte n'a pas de bio."],
    ["UNCHANGED", "avatar", "Ce compte n'a pas d'avatar."],
    [
      "NO_USERNAME",
      "displayName",
      "Ce compte n'a pas encore de pseudo : son inscription n'est pas finie.",
    ],
    ["USERNAME_TAKEN", "username", "Aucun pseudo libre n'a pu être généré. Réessaie."],
  ])("says why the repository refused (%s on %s)", async (reason, field, message) => {
    m.resetProfileFieldFromConsole.mockResolvedValue({ ok: false, reason });
    const result = await resetUserProfileFieldAction({}, form({ userId: TARGET, field }));
    expect(result.error).toBe(message);
    expect(m.remove).not.toHaveBeenCalled();
  });
});
