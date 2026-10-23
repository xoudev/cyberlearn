import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The placement test's submit action.
 *
 * It stores the result (the service), then ends the sign-up (a call to
 * Supabase Auth), then shows the result. A first submission can stop between
 * the two; the second must then end the sign-up too, or the account has a
 * result and no way to the dashboard.
 */

const m = vi.hoisted(() => ({
  getUser: vi.fn(),
  submitPlacementFor: vi.fn(),
  setOnboardingComplete: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => Promise.resolve({ auth: { getUser: m.getUser } }),
}));
vi.mock("@/lib/onboarding/placement", () => ({ submitPlacementFor: m.submitPlacementFor }));
vi.mock("@/lib/onboarding/finalize", () => ({ setOnboardingComplete: m.setOnboardingComplete }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const { submitPlacementTest } = await import("../submit-placement");

function form(): FormData {
  const data = new FormData();
  data.set("answer_q1", "a");
  return data;
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

describe("submitPlacementTest", () => {
  it("sends somebody signed out to the sign-in, storing nothing", async () => {
    m.getUser.mockResolvedValue({ data: { user: null } });
    await expect(submitPlacementTest({ success: false }, form())).rejects.toThrow(
      "REDIRECT /login",
    );
    expect(m.submitPlacementFor).not.toHaveBeenCalled();
  });

  it("ends the sign-up, then shows the result", async () => {
    m.submitPlacementFor.mockResolvedValue({
      ok: true,
      scores: { devScore: 80, cybersecScore: 40, networkScore: 60 },
      recommendedPathSlug: "bases-du-reseau",
    });
    await expect(submitPlacementTest({ success: false }, form())).rejects.toThrow(
      "REDIRECT /onboarding/placement-test/result?dev=80&cybersec=40&network=60&path=bases-du-reseau",
    );
    expect(m.submitPlacementFor).toHaveBeenCalledWith("user-1", {
      answers: [{ questionId: "q1", selectedOptionId: "a" }],
    });
    expect(m.setOnboardingComplete).toHaveBeenCalledWith("user-1");
  });

  it("ends the sign-up on a second submission too, before the dashboard", async () => {
    m.submitPlacementFor.mockResolvedValue({ ok: false, reason: "taken" });
    await expect(submitPlacementTest({ success: false }, form())).rejects.toThrow(
      "REDIRECT /dashboard",
    );
    expect(m.setOnboardingComplete).toHaveBeenCalledWith("user-1");
  });

  it("answers invalid answers with the message, and ends nothing", async () => {
    m.submitPlacementFor.mockResolvedValue({
      ok: false,
      reason: "invalid",
      error: "Réponses invalides. Veuillez réessayer.",
    });
    expect(await submitPlacementTest({ success: false }, form())).toEqual({
      success: false,
      message: "Réponses invalides. Veuillez réessayer.",
    });
    expect(m.setOnboardingComplete).not.toHaveBeenCalled();
  });
});
