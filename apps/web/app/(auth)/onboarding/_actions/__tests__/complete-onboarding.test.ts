import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Step 1 of signing up hands back what was typed when it is refused. React
 * resets an uncontrolled form once its action has run, so "Ce nom
 * d'utilisateur est déjà pris" also emptied the name shown and the bio.
 */

const m = vi.hoisted(() => ({
  getUser: vi.fn(),
  saveOnboardingProfile: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => Promise.resolve({ auth: { getUser: m.getUser } }),
}));
vi.mock("@/lib/onboarding/steps", () => ({ saveOnboardingProfile: m.saveOnboardingProfile }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const { completeOnboarding } = await import("../complete-onboarding");

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

const TYPED = {
  username: "alex",
  displayName: "Alex Martin",
  bio: "Je prépare un BTS SIO et je veux comprendre les injections SQL.",
};

beforeEach(() => {
  vi.clearAllMocks();
  m.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

describe("completeOnboarding", () => {
  it("hands back every field as typed when the handle is taken", async () => {
    m.saveOnboardingProfile.mockResolvedValue({
      ok: false,
      errors: { username: "Ce nom d'utilisateur est déjà pris." },
    });
    expect(await completeOnboarding({ success: false }, form(TYPED))).toEqual({
      success: false,
      errors: { username: ["Ce nom d'utilisateur est déjà pris."] },
      values: TYPED,
    });
  });

  it("hands back an empty bio as empty, not as missing", async () => {
    m.saveOnboardingProfile.mockResolvedValue({ ok: false, errors: { username: "x" } });
    const state = await completeOnboarding(
      { success: false },
      form({ username: "a", displayName: "Alex" }),
    );
    expect(state.values).toEqual({ username: "a", displayName: "Alex", bio: "" });
  });

  it("goes on to the avatar step once the profile is saved", async () => {
    m.saveOnboardingProfile.mockResolvedValue({ ok: true });
    await expect(completeOnboarding({ success: false }, form(TYPED))).rejects.toThrow(
      "REDIRECT /onboarding/avatar",
    );
  });
});
