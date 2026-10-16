// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ signOut: vi.fn<() => Promise<{ error: null }>>() }));

vi.mock("@cyberlearn/db/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut: m.signOut } }),
}));

const { OnboardingSignOut } = await import("../onboarding-sign-out");

/**
 * Nothing of the site's shell is drawn during the sign-up, and every other
 * page leads back to it: this button is the only way to close the session
 * before the end, as "Se déconnecter" is under the app's onboarding.
 */

afterEach(cleanup);

beforeEach(() => {
  m.signOut.mockReset();
  m.signOut.mockResolvedValue({ error: null });
});

describe("OnboardingSignOut", () => {
  it("offers to sign out", () => {
    render(<OnboardingSignOut />);
    expect(screen.getByRole("button", { name: "Se déconnecter" })).toBeTruthy();
  });

  it("closes the session when pressed, once", async () => {
    render(<OnboardingSignOut />);
    const button = screen.getByRole("button", { name: "Se déconnecter" });

    fireEvent.click(button);

    await waitFor(() => {
      expect(m.signOut).toHaveBeenCalledTimes(1);
    });
    const busy = screen.getByRole("button", { name: "Déconnexion…" });
    expect(busy.hasAttribute("disabled")).toBe(true);
  });
});
