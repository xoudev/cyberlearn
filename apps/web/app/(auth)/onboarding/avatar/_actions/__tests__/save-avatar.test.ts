import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => Promise.resolve({ auth: { getUser } }),
}));

const setAvatarUrl = vi.fn();
vi.mock("@cyberlearn/db", () => ({ userRepository: { setAvatarUrl } }));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const { saveAvatar } = await import("../save-avatar");

function form(avatarUrl: string): FormData {
  const data = new FormData();
  data.set("avatarUrl", avatarUrl);
  return data;
}

beforeEach(() => {
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  setAvatarUrl.mockReset();
});

describe("saveAvatar", () => {
  it("goes on to the goals step, which comes before any placement test", async () => {
    await expect(saveAvatar({}, form("/avatars/av-3.svg"))).rejects.toThrow(
      "REDIRECT /onboarding/goals",
    );
    expect(setAvatarUrl).toHaveBeenCalledWith("user-1", "/avatars/av-3.svg");
  });

  it("keeps the photo the profile already has, writing nothing", async () => {
    await expect(saveAvatar({}, form("current"))).rejects.toThrow("REDIRECT /onboarding/goals");
    expect(setAvatarUrl).not.toHaveBeenCalled();
  });

  it("refuses an avatar that is not one of the built-in ones", async () => {
    expect(await saveAvatar({}, form("https://evil.example/a.svg"))).toEqual({
      error: "Avatar invalide.",
    });
    expect(setAvatarUrl).not.toHaveBeenCalled();
  });
});
