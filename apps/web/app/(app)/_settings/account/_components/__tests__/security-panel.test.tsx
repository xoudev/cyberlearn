// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The second factor's controls on the site: an administrator is never offered
 * its removal, and is pointed to the break-glass procedure instead; anybody
 * else still reaches the confirmation step.
 */

const m = vi.hoisted(() => ({
  listFactors: vi.fn(),
  unenroll: vi.fn(),
  challengeAndVerify: vi.fn(),
}));

vi.mock("@cyberlearn/db/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      mfa: {
        listFactors: m.listFactors,
        unenroll: m.unenroll,
        challengeAndVerify: m.challengeAndVerify,
      },
      refreshSession: () => Promise.resolve({ error: null }),
    },
  }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/app/(auth)/_actions/password-auth", () => ({ updatePassword: vi.fn() }));

const { SecurityPanel } = await import("../security-panel");

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.listFactors.mockResolvedValue({
    data: { totp: [{ id: "f-1", friendly_name: "CyberLearn Authenticator" }] },
    error: null,
  });
});

afterEach(cleanup);

describe("the security panel", () => {
  it("offers an administrator no removal, and points to the break-glass procedure", async () => {
    render(<SecurityPanel canDisableMfa={false} />);
    expect(await screen.findByText("MFA ACTIF")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Désactiver le MFA" })).toBeNull();
    expect(
      screen.getByText(/procédure de secours décrite dans docs\/authentication\.md/),
    ).toBeTruthy();
  });

  it("offers anybody else the removal, behind a confirmation", async () => {
    render(<SecurityPanel canDisableMfa />);
    fireEvent.click(await screen.findByRole("button", { name: "Désactiver le MFA" }));
    expect(screen.getByRole("button", { name: "Confirmer la désactivation" })).toBeTruthy();
    expect(screen.queryByText(/procédure de secours/)).toBeNull();
    expect(m.unenroll).not.toHaveBeenCalled();
  });

  it("says nothing of the procedure to an administrator without a factor", async () => {
    m.listFactors.mockResolvedValue({ data: { totp: [] }, error: null });
    render(<SecurityPanel canDisableMfa={false} />);
    expect(await screen.findByText("MFA INACTIF")).toBeTruthy();
    expect(screen.queryByText(/procédure de secours/)).toBeNull();
  });
});
