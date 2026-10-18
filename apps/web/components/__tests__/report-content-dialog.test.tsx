// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  reportContentAction:
    vi.fn<
      (input: {
        surface: string;
        contentId: string;
        reason: string;
        comment?: string;
      }) => Promise<{ ok: true } | { ok: false; error: string }>
    >(),
}));

vi.mock("@/app/(app)/_actions/report-actions", () => m);

const { ReportContentButton } = await import("../report-content-dialog");

/**
 * « Signaler » under somebody else's content: a window with the reasons and
 * an optional comment, a reason required, the service's refusal said in it,
 * and once sent, the button says so.
 */

const ID = "11111111-1111-4111-8111-111111111111";

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  m.reportContentAction.mockResolvedValue({ ok: true });
});

function open(): void {
  render(<ReportContentButton surface="LESSON_ANSWER" contentId={ID} />);
  fireEvent.click(screen.getByRole("button", { name: "Signaler cette réponse" }));
}

describe("ReportContentButton", () => {
  it("opens a window that asks why, in the words of the content", () => {
    open();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getAllByText("Pourquoi signaler cette réponse ?").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Spam ou publicité")).toBeTruthy();
  });

  it("asks for a reason before sending anything", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Envoyer le signalement" }));
    expect(screen.getByRole("alert").textContent).toBe("Choisis une raison.");
    expect(m.reportContentAction).not.toHaveBeenCalled();
  });

  it("sends the reason and the comment, then says it is done", async () => {
    open();
    fireEvent.click(screen.getByLabelText("Spam ou publicité"));
    fireEvent.change(screen.getByLabelText(/Précisions pour l/u), {
      target: { value: "Un lien de casino." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer le signalement" }));

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toContain("ton signalement est envoyé");
    });
    expect(m.reportContentAction).toHaveBeenCalledWith({
      surface: "LESSON_ANSWER",
      contentId: ID,
      reason: "SPAM",
      comment: "Un lien de casino.",
    });

    // The action row's "Fermer", under the header's close button of the same name.
    const close = screen.getAllByRole("button", { name: "Fermer" }).at(-1);
    if (close === undefined) throw new Error("no close button");
    fireEvent.click(close);
    const button = screen.getByRole("button", { name: /signalement envoyé/u });
    expect(button.textContent).toBe("Signalé");
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("says the service's refusal in the window, and keeps the button", async () => {
    m.reportContentAction.mockResolvedValue({
      ok: false,
      error: "Ce contenu n'est plus disponible.",
    });
    open();
    fireEvent.click(screen.getByLabelText("Autre chose"));
    fireEvent.click(screen.getByRole("button", { name: "Envoyer le signalement" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Ce contenu n'est plus disponible.");
    });
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByRole("button", { name: "Signaler cette réponse" })).toBeTruthy();
  });
});
