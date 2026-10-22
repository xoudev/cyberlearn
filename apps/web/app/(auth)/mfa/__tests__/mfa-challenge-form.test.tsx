// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MFA_RECOURSE_PATH, MFA_RECOURSE_PROMPT } from "@cyberlearn/lib/auth/mfa-recourse";

/**
 * The site's second-factor screen: where somebody who lost the phone ends up,
 * and where a refused code is announced.
 */

const m = vi.hoisted(() => ({
  listFactors: vi.fn(),
  challengeAndVerify: vi.fn(),
  signOut: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  completeMfaSignIn: vi.fn(),
}));

vi.mock("@cyberlearn/db/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signOut: m.signOut,
      mfa: { listFactors: m.listFactors, challengeAndVerify: m.challengeAndVerify },
    },
  }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: m.replace, refresh: m.refresh }),
}));
vi.mock("../../_actions/mfa-sign-in", () => ({ completeMfaSignIn: m.completeMfaSignIn }));

const { MfaChallengeForm } = await import("../mfa-challenge-form");

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.listFactors.mockResolvedValue({ data: { totp: [{ id: "f-1" }] }, error: null });
  m.signOut.mockResolvedValue({ error: null });
});

afterEach(cleanup);

describe("the code screen", () => {
  it("tells somebody without the phone that the team can help, and where to write", () => {
    render(<MfaChallengeForm next="/dashboard" />);

    const link = screen.getByRole("link", { name: MFA_RECOURSE_PROMPT });
    expect(link.getAttribute("href")).toBe(MFA_RECOURSE_PATH);
    expect(link.getAttribute("href")).toContain("theme=SECURITY");
    expect(screen.getByText(/le support retire ce facteur/)).toBeTruthy();
  });

  it("keeps the way out of the screen", () => {
    render(<MfaChallengeForm next="/dashboard" />);

    expect(screen.getByRole("button", { name: "Annuler et se déconnecter" })).toBeTruthy();
  });

  it("announces a refused code by itself, since nobody pressed a button", async () => {
    m.challengeAndVerify.mockResolvedValue({ error: new Error("invalid") });
    render(<MfaChallengeForm next="/dashboard" />);

    fireEvent.change(screen.getByLabelText("Code temporaire"), { target: { value: "123456" } });

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Code invalide ou expiré.");
    await waitFor(() => {
      expect(m.challengeAndVerify).toHaveBeenCalledTimes(1);
    });
    expect(m.replace).not.toHaveBeenCalled();
  });

  it("shows no alert before anything went wrong", () => {
    render(<MfaChallengeForm next="/dashboard" />);

    expect(screen.queryByRole("alert")).toBeNull();
  });
});
