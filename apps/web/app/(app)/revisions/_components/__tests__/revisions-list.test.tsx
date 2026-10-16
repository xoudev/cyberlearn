// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The day's reviews, graded in place. Each grade reloads the page, and the
 * reloaded page no longer lists the review just graded.
 */

const submitReviewAction = vi.hoisted(() =>
  vi.fn<
    (
      scheduleId: string,
      quality: 1 | 3 | 5,
    ) => Promise<{ success: boolean; reviewXp?: number; mastered?: boolean; error?: string }>
  >(),
);
vi.mock("../../_actions/review-actions", () => ({ submitReviewAction }));

const { RevisionsList } = await import("../revisions-list");
type ReviewRow = Parameters<typeof RevisionsList>[0]["rows"][number];

function reviewRow(scheduleId: string, title: string): ReviewRow {
  return {
    scheduleId,
    title,
    slug: scheduleId,
    catLabel: "RÉSEAU",
    catColor: "var(--color-category-network)",
    catBorder: "transparent",
    dueText: "Dû aujourd'hui",
    dueToday: true,
    est: "3 min",
    reviewXp: 5,
  };
}

const PORTS = reviewRow("s1", "Les ports");
const DNS = reviewRow("s2", "Le DNS");

function List({ rows }: { rows: ReviewRow[] }): React.ReactElement {
  return <RevisionsList rows={rows} empty={<p>Tout est à jour</p>} />;
}

async function gradeEasy(): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Facile ✓" }));
    await Promise.resolve();
  });
}

beforeEach(() => {
  submitReviewAction.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("the revisions list", () => {
  it("shows the empty state when the session has no review", () => {
    render(<List rows={[]} />);
    expect(screen.getByText("Tout est à jour")).toBeTruthy();
  });

  it("keeps a graded review with its outcome once the reloaded page drops it", async () => {
    submitReviewAction.mockResolvedValue({ success: true, reviewXp: 5, mastered: false });
    const { rerender } = render(<List rows={[PORTS, DNS]} />);
    await gradeEasy();
    // The reload: the graded review is no longer due.
    rerender(<List rows={[DNS]} />);
    expect(screen.getByText("Les ports")).toBeTruthy();
    expect(screen.getByText("Bien mémorisé · +5 XP")).toBeTruthy();
    // The next one opened, numbered where it stood.
    expect(screen.getByText("02")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Facile ✓" })).toBeTruthy();
  });

  it("stays up when the last review is graded and nothing is left due", async () => {
    submitReviewAction.mockResolvedValue({ success: true, reviewXp: 5, mastered: true });
    const { rerender } = render(<List rows={[PORTS]} />);
    await gradeEasy();
    rerender(<List rows={[]} />);
    expect(screen.queryByText("Tout est à jour")).toBeNull();
    expect(screen.getByText("Acquise · +5 XP · elle sort du cycle de révision")).toBeTruthy();
  });

  it("takes in the review the reload brings", async () => {
    submitReviewAction.mockResolvedValue({ success: true, reviewXp: 5, mastered: false });
    const { rerender } = render(<List rows={[PORTS]} />);
    await gradeEasy();
    rerender(<List rows={[DNS]} />);
    expect(screen.getByText("Les ports")).toBeTruthy();
    expect(screen.getByText("Le DNS")).toBeTruthy();
  });

  it("says why a grade was refused instead of doing nothing", async () => {
    submitReviewAction.mockResolvedValue({
      success: false,
      error: "Cette révision n'est plus à faire.",
    });
    render(<List rows={[PORTS]} />);
    await gradeEasy();
    expect(screen.getByRole("alert").textContent).toBe("Cette révision n'est plus à faire.");
    expect(screen.getByRole("button", { name: "Facile ✓" })).toBeTruthy();
  });

  it("says the grade was not saved when the request fails", async () => {
    submitReviewAction.mockRejectedValue(new Error("Failed to fetch"));
    render(<List rows={[PORTS]} />);
    await gradeEasy();
    expect(screen.getByRole("alert").textContent).toBe(
      "La révision n'a pas pu être enregistrée. Réessaie.",
    );
  });
});
