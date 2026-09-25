import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  saveOnboardingProfile: vi.fn<(u: string, input: unknown) => Promise<unknown>>(),
  saveOnboardingAvatar: vi.fn<(u: string, avatarUrl: unknown) => Promise<unknown>>(),
  finishOnboardingFor: vi.fn<(u: string, input: unknown) => Promise<unknown>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/onboarding/steps", () => ({
  saveOnboardingProfile: m.saveOnboardingProfile,
  saveOnboardingAvatar: m.saveOnboardingAvatar,
  finishOnboardingFor: m.finishOnboardingFor,
}));

const { POST: PROFILE } = await import("../profile/route");
const { POST: AVATAR } = await import("../avatar/route");
const { POST: FINISH } = await import("../finish/route");

function post(url: string, body: string): NextRequest {
  return new NextRequest(`https://cyberlearn.fr/api/mobile/${url}`, { method: "POST", body });
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
});

describe("every sign-up route", () => {
  it.each([
    ["profile", () => PROFILE(post("onboarding/profile", "{}"))],
    ["avatar", () => AVATAR(post("onboarding/avatar", "{}"))],
    ["finish", () => FINISH(post("onboarding/finish", "{}"))],
  ])("refuses a caller the gate turns away (%s)", async (_n, call) => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
    expect(m.saveOnboardingProfile).not.toHaveBeenCalled();
    expect(m.saveOnboardingAvatar).not.toHaveBeenCalled();
    expect(m.finishOnboardingFor).not.toHaveBeenCalled();
  });

  it.each([
    ["profile", () => PROFILE(post("onboarding/profile", "nope"))],
    ["avatar", () => AVATAR(post("onboarding/avatar", "nope"))],
    ["finish", () => FINISH(post("onboarding/finish", "nope"))],
  ])("refuses a body that is not JSON (%s)", async (_n, call) => {
    expect((await call()).status).toBe(400);
  });
});

describe("the three steps", () => {
  it("saves the profile as the caller, 409 with the field errors when refused", async () => {
    const body = { username: "alex", displayName: "Alex" };
    m.saveOnboardingProfile.mockResolvedValue({ ok: true });
    expect((await PROFILE(post("onboarding/profile", JSON.stringify(body)))).status).toBe(200);
    expect(m.saveOnboardingProfile).toHaveBeenCalledWith("user-1", body);

    m.saveOnboardingProfile.mockResolvedValue({ ok: false, errors: { username: "pris" } });
    const res = await PROFILE(post("onboarding/profile", JSON.stringify(body)));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, errors: { username: "pris" } });
  });

  it("saves the avatar named in the body, and nothing else", async () => {
    m.saveOnboardingAvatar.mockResolvedValue({ ok: true });
    await AVATAR(post("onboarding/avatar", JSON.stringify({ avatarUrl: "/avatars/av-2.svg" })));
    expect(m.saveOnboardingAvatar).toHaveBeenCalledWith("user-1", "/avatars/av-2.svg");

    m.saveOnboardingAvatar.mockResolvedValue({ ok: false, error: "Avatar invalide." });
    const res = await AVATAR(post("onboarding/avatar", JSON.stringify({})));
    expect(res.status).toBe(409);
    expect(m.saveOnboardingAvatar).toHaveBeenLastCalledWith("user-1", null);
  });

  it("finishes as the caller with the answers given", async () => {
    m.finishOnboardingFor.mockResolvedValue({ ok: true });
    const body = { goals: ["DEV"], level: "NEW" };
    const res = await FINISH(post("onboarding/finish", JSON.stringify(body)));
    expect(res.status).toBe(200);
    expect(m.finishOnboardingFor).toHaveBeenCalledWith("user-1", body);
  });
});
