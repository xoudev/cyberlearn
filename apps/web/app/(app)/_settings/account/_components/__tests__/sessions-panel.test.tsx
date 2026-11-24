// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SignOutOthersState } from "../../_actions/sign-out-others-state";

const signOut = vi.hoisted(() => vi.fn<() => Promise<SignOutOthersState>>());
vi.mock("../../_actions/sign-out-others", () => ({ signOutOtherSessions: signOut }));
vi.mock("../../../_components/SettingsPrimitives", () => ({
  SettingsCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section aria-label={title}>{children}</section>
  ),
}));

const { SessionsPanel } = await import("../sessions-panel");

beforeEach(() => {
  vi.clearAllMocks();
  signOut.mockResolvedValue({
    status: "done",
    message: "Tes autres sessions sont fermées.",
  });
});

afterEach(() => {
  cleanup();
});

describe("SessionsPanel", () => {
  it("asks before it closes anything", () => {
    render(<SessionsPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Fermer mes autres sessions" }));

    expect(signOut).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Oui, fermer les autres sessions" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeDefined();
  });

  it("closes nothing when the question is taken back", () => {
    render(<SessionsPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Fermer mes autres sessions" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(signOut).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Fermer mes autres sessions" })).toBeDefined();
  });

  it("closes the other sessions once confirmed, and says so", async () => {
    render(<SessionsPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Fermer mes autres sessions" }));
    fireEvent.click(screen.getByRole("button", { name: "Oui, fermer les autres sessions" }));

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe("Tes autres sessions sont fermées.");
    });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("announces a refusal as an alert", async () => {
    signOut.mockResolvedValue({ status: "error", message: "La déconnexion a échoué." });
    render(<SessionsPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Fermer mes autres sessions" }));
    fireEvent.click(screen.getByRole("button", { name: "Oui, fermer les autres sessions" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("La déconnexion a échoué.");
    });
  });
});
