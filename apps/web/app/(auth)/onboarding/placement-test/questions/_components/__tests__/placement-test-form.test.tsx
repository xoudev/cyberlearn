// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * "Passer · aller au tableau de bord" on the questions of the placement test.
 *
 * It was a plain link to /dashboard. A new account reaches the test before it
 * has finished signing up (the flag is set when the test is submitted or
 * skipped), so the middleware sent it back to /onboarding, which sent it back
 * to the avatar: the reader chose to skip and found themselves two steps back.
 * The intro's "Passer" ends the sign-up through skipOnboarding; this one does
 * the same.
 */

const m = vi.hoisted(() => ({
  skipOnboarding: vi.fn<() => Promise<void>>(),
  submitPlacementTest: vi.fn<() => Promise<{ success: boolean }>>(),
}));

vi.mock("../../_actions/submit-placement", () => ({ submitPlacementTest: m.submitPlacementTest }));
vi.mock("../../../../_actions/finalize-onboarding", () => ({ skipOnboarding: m.skipOnboarding }));

const { PlacementTestForm } = await import("../placement-test-form");

const QUESTIONS = [
  {
    id: "q-dev",
    category: "DEV" as const,
    difficulty: "BEGINNER",
    question: "Que fait une boucle ?",
    options: [
      { id: "a", text: "Elle répète" },
      { id: "b", text: "Elle stoppe" },
    ],
  },
  {
    id: "q-net",
    category: "NETWORK" as const,
    difficulty: "INTERMEDIATE",
    question: "Que fait DNS ?",
    options: [
      { id: "a", text: "Il résout les noms" },
      { id: "b", text: "Il chiffre" },
    ],
  },
];

const SKIP = "Passer · aller au tableau de bord";

afterEach(cleanup);

beforeEach(() => {
  m.skipOnboarding.mockReset();
  m.skipOnboarding.mockResolvedValue(undefined);
  m.submitPlacementTest.mockReset();
  m.submitPlacementTest.mockResolvedValue({ success: false });
});

describe("the skip control of the placement test", () => {
  it("is a button, not a link to the dashboard", () => {
    render(<PlacementTestForm questions={QUESTIONS} estimatedMinutes={2} />);

    expect(screen.queryByRole("link", { name: SKIP })).toBeNull();
    const skip = screen.getByRole("button", { name: SKIP });
    expect(skip.getAttribute("type")).toBe("submit");
  });

  it("ends the sign-up when pressed, without waiting for the answers", async () => {
    render(<PlacementTestForm questions={QUESTIONS} estimatedMinutes={2} />);

    // Every question is required and none is answered: a browser lets the skip
    // through because of formnovalidate on the button. jsdom does not read that
    // attribute, so the form's own novalidate stands in for it here.
    const skip = screen.getByRole("button", { name: SKIP });
    expect(skip.hasAttribute("formnovalidate")).toBe(true);
    const form = skip.closest("form");
    if (form === null) throw new Error("the skip control is outside the form");
    form.noValidate = true;
    fireEvent.click(skip);

    await waitFor(() => {
      expect(m.skipOnboarding).toHaveBeenCalledTimes(1);
    });
    expect(m.submitPlacementTest).not.toHaveBeenCalled();
  });

  it("is not what pressing Enter in the form does: the test's own button comes first", () => {
    render(<PlacementTestForm questions={QUESTIONS} estimatedMinutes={2} />);

    const submitButtons = screen
      .getAllByRole("button")
      .filter((button) => button.getAttribute("type") === "submit");
    expect(submitButtons[0]?.textContent).toContain("Valider le test");
    expect(submitButtons[1]?.textContent).toBe(SKIP);
  });
});
