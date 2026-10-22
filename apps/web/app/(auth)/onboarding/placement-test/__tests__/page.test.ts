import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The placement test's introduction, for somebody who is still signing up.
 *
 * Its "Passer" ends the sign-up. "Commencer le test" leads to the questions,
 * which send the reader straight back here when no question is active: it is
 * not offered then, or the two pages would send the reader round in a circle.
 */

const m = vi.hoisted(() => ({
  getUser: vi.fn(),
  findOnboardingProfile: vi.fn(),
  hasResult: vi.fn(),
  countActiveQuestions: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => Promise.resolve({ auth: { getUser: m.getUser } }),
}));
vi.mock("@cyberlearn/db", () => ({
  userRepository: { findOnboardingProfile: m.findOnboardingProfile },
  placementRepository: {
    hasResult: m.hasResult,
    countActiveQuestions: m.countActiveQuestions,
  },
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("../../_actions/finalize-onboarding", () => ({ skipOnboarding: vi.fn() }));
vi.mock("../../_components/onboarding-sign-out", () => ({ OnboardingSignOut: () => null }));

const { default: PlacementTestIntroPage } = await import("../page");

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  m.findOnboardingProfile.mockResolvedValue({ username: "alex" });
  m.hasResult.mockResolvedValue(false);
  m.countActiveQuestions.mockResolvedValue(12);
});

async function render(): Promise<string> {
  return renderToStaticMarkup(await PlacementTestIntroPage());
}

describe("the placement test's introduction", () => {
  it("sends somebody without a handle back to the first step", async () => {
    m.findOnboardingProfile.mockResolvedValue({ username: null });
    await expect(render()).rejects.toThrow("REDIRECT /onboarding");
  });

  it("sends somebody whose result is in to the dashboard", async () => {
    m.hasResult.mockResolvedValue(true);
    await expect(render()).rejects.toThrow("REDIRECT /dashboard");
  });

  it("offers to start the test and to skip it", async () => {
    const html = await render();
    expect(html).toContain("Commencer le test");
    expect(html).toContain('href="/onboarding/placement-test/questions"');
    expect(html).toContain("Passer");
  });

  it("counts the questions asked, and the minutes they take", async () => {
    const html = await render();
    expect(html).toContain(">12<");
    expect(html).toContain(">9<");
  });

  it("offers only the skip when no question is active", async () => {
    m.countActiveQuestions.mockResolvedValue(0);
    const html = await render();
    expect(html).not.toContain("Commencer le test");
    expect(html).not.toContain("/onboarding/placement-test/questions");
    expect(html).toContain("Passer");
  });
});
