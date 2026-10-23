import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The questions of the placement test, for somebody who is still signing up.
 *
 * With no active question, or a test already taken, there is nothing to take,
 * and "/dashboard" is not open to an account that has not finished signing up:
 * the middleware sends it to /onboarding, which sends it to the avatar. A page
 * cannot finish the sign-up (that rewrites the session cookies, and only an
 * action can), so it sends the reader to the intro, where "Passer" does, and
 * which sends on to the dashboard an account that is done.
 */

const m = vi.hoisted(() => ({
  getUser: vi.fn(),
  placementTestFor: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => Promise.resolve({ auth: { getUser: m.getUser } }),
}));
vi.mock("@/lib/onboarding/placement", () => ({ placementTestFor: m.placementTestFor }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("../_components/placement-test-form", () => ({ PlacementTestForm: () => null }));
vi.mock("../../../_components/onboarding-sign-out", () => ({ OnboardingSignOut: () => null }));

const { default: PlacementQuestionsPage } = await import("../page");

beforeEach(() => {
  m.getUser.mockReset();
  m.placementTestFor.mockReset();
  m.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

describe("the placement test's questions page", () => {
  it("sends somebody signed out to the sign-in", async () => {
    m.getUser.mockResolvedValue({ data: { user: null } });
    await expect(PlacementQuestionsPage()).rejects.toThrow("REDIRECT /login");
  });

  it("sends back to the intro, where Passer ends the sign-up, when no question is active", async () => {
    m.placementTestFor.mockResolvedValue({ status: "empty" });
    await expect(PlacementQuestionsPage()).rejects.toThrow("REDIRECT /onboarding/placement-test");
  });

  it("sends back to the intro somebody whose result is already in", async () => {
    m.placementTestFor.mockResolvedValue({ status: "taken" });
    await expect(PlacementQuestionsPage()).rejects.toThrow("REDIRECT /onboarding/placement-test");
  });

  it("draws the test when there are questions", async () => {
    m.placementTestFor.mockResolvedValue({
      status: "open",
      questions: [
        {
          id: "q1",
          category: "DEV",
          difficulty: "BEGINNER",
          question: "Que fait une boucle ?",
          options: [{ id: "a", text: "Elle répète" }],
        },
      ],
      estimatedMinutes: 1,
    });
    const html = renderToStaticMarkup(await PlacementQuestionsPage());
    expect(html).toContain("TEST DE PLACEMENT");
  });
});
