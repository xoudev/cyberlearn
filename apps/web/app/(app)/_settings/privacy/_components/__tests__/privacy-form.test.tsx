// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The privacy form saves through a server action inside a transition. A call
 * that throws must be said in a toast, with the choices left unsaved on the
 * form, instead of reaching the error boundary.
 */

const m = vi.hoisted(() => ({
  update: vi.fn<(prev: unknown, fd: FormData) => Promise<{ success?: boolean; error?: string }>>(),
}));

vi.mock("../../_actions/update-privacy", () => ({ updatePrivacyAction: m.update }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { toast } = await import("sonner");
const { PrivacyForm } = await import("../PrivacyForm");

beforeEach(() => {
  vi.clearAllMocks();
  m.update.mockResolvedValue({ success: true });
});
afterEach(() => {
  cleanup();
});

function renderForm(): void {
  render(
    <PrivacyForm
      initialVisibility="ANONYMOUS"
      initialPublicProfile={true}
      initialFriendsLeaderboard={false}
    />,
  );
}

describe("PrivacyForm", () => {
  it("sends the chosen visibility and the two switches as they are", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: /Public/ }));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => {
      expect(m.update).toHaveBeenCalledTimes(1);
    });
    const fd = m.update.mock.calls[0]?.[1];
    expect(fd?.get("leaderboardVisibility")).toBe("PUBLIC");
    expect(fd?.get("publicProfile")).toBe("true");
    expect(fd?.get("friendsLeaderboard")).toBe("false");
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Confidentialité enregistrée");
    });
  });

  it("says the choices were not saved, and keeps them to save again, when the call fails", async () => {
    m.update.mockRejectedValueOnce(new Error("network"));
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: /Masqué/ }));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Confidentialité non enregistrée, réessaie.");
    });
    expect(toast.success).not.toHaveBeenCalled();
    // Still chosen and still unsaved: the bar offers another try.
    expect(screen.getByRole("radio", { name: /Masqué/ }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("Modifications en attente")).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Enregistrer" }).hasAttribute("disabled")).toBe(
        false,
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Confidentialité enregistrée");
    });
    expect(screen.getByText("Synchronisé")).toBeTruthy();
  });

  it("still shows the reason the server gives when it refuses the choices", async () => {
    m.update.mockResolvedValueOnce({ error: "Paramètres de confidentialité invalides." });
    renderForm();
    fireEvent.click(screen.getByRole("switch", { name: "Visible par mes amis" }));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Paramètres de confidentialité invalides.");
    });
  });
});
