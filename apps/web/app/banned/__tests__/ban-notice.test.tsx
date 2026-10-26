// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appealView, type AppealView } from "@cyberlearn/lib/tickets/appeal";

const m = vi.hoisted(() => ({
  signOut: vi.fn<() => Promise<void>>(),
  push: vi.fn(),
  acknowledgeBanAction: vi.fn(),
  appealBanAction: vi.fn(),
}));

vi.mock("@cyberlearn/db/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut: m.signOut } }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: m.push }) }));
vi.mock("../_actions/appeal-actions", () => ({
  acknowledgeBanAction: m.acknowledgeBanAction,
  appealBanAction: m.appealBanAction,
}));
// The dialog is the design system's business; whether it is open is this file's.
vi.mock("@cyberlearn/ui", () => ({
  ModalShell: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
}));

const { BanNotice } = await import("../_components/ban-notice");

/**
 * The notice on /banned and the appeal under it: whatever became of the
 * appeal, the account can still sign out - the page is the only one it can
 * open, so without the button it was stuck signed in.
 */

function show(alreadyAppealed: boolean, appeal: AppealView | null = null): void {
  render(
    <BanNotice
      reason="Spam répété sur le forum."
      endsLabel="Il reste 3 jours."
      alreadyAcknowledged
      alreadyAppealed={alreadyAppealed}
      appeal={appeal}
    />,
  );
}

const REPLY = {
  body: "Après relecture, le bannissement est maintenu.",
  createdAt: "2026-10-20T09:30:00.000Z",
};

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  m.signOut.mockResolvedValue(undefined);
  m.acknowledgeBanAction.mockResolvedValue({ ok: true });
});

describe("BanNotice", () => {
  it("offers the appeal and the way out before anything is sent", () => {
    show(false);
    expect(screen.getByRole("button", { name: "Faire appel" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Se déconnecter" })).toBeTruthy();
  });

  it("keeps the way out while the appeal is being written", () => {
    show(false);
    fireEvent.click(screen.getByRole("button", { name: "Faire appel" }));
    expect(screen.getByRole("button", { name: "Envoyer l'appel" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Faire appel" })).toBeNull();
    expect(screen.getByRole("button", { name: "Se déconnecter" })).toBeTruthy();
  });

  it("keeps the way out once the appeal is sent, and signs out to the login", async () => {
    show(true);
    expect(screen.getByText(/Ton appel a été transmis/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Faire appel" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));
    expect(m.signOut).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => {
      expect(m.push).toHaveBeenCalledWith("/login");
    });
  });

  it("says the appeal is received, and that the answer will be here, before the team writes", () => {
    show(true, appealView({ status: "OPEN", reply: null }));
    expect(screen.getByText("Appel transmis")).toBeTruthy();
    expect(screen.getByText(/s'affichera ici/)).toBeTruthy();
    expect(screen.queryByText(/Réponse de l'équipe/)).toBeNull();
  });

  it("shows the team's answer on an appeal that was examined, and stops promising an e-mail", () => {
    // The case the old text got wrong for good: answered, refused, and still
    // told "la réponse arrivera par e-mail" with no way to appeal again.
    show(true, appealView({ status: "RESOLVED", reply: REPLY }));

    expect(screen.getByText("Appel examiné")).toBeTruthy();
    expect(screen.getByText(/le bannissement est maintenu\. Sa dernière réponse/)).toBeTruthy();
    expect(screen.getByText(/Après relecture, le bannissement est maintenu\./)).toBeTruthy();
    expect(screen.getByText(/Réponse de l'équipe · 20 octobre 2026/)).toBeTruthy();
    expect(screen.queryByText(/arrivera par e-mail/)).toBeNull();
    expect(screen.getByRole("status").getAttribute("data-stage")).toBe("DECIDED");
  });

  it("shows the answer while the appeal is still being examined", () => {
    show(true, appealView({ status: "IN_PROGRESS", reply: REPLY }));
    expect(screen.getByText("Appel en cours d'examen")).toBeTruthy();
    expect(screen.getByText(/Après relecture/)).toBeTruthy();
  });

  it("falls back to 'received' for an appeal whose ticket could not be read", () => {
    // Retention purged the ticket, or the page was drawn before it existed.
    show(true, null);
    expect(screen.getByText("Appel transmis")).toBeTruthy();
  });
});
