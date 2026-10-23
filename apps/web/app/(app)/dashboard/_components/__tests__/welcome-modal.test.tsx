// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The welcome video's main button said "Lancer ma première leçon" and opened
 * the lesson catalogue. It opens what the mission card under it offers now.
 *
 * And it gives way to a window the address already asks for: the reminder's
 * link (/dashboard?rappel=1) opened the day's recall under the welcome video,
 * two modals at the same height.
 */

const address = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(address.search),
}));

// The registry of the windows the address opens, without loading their code:
// the welcome reads its keys. One of the names is not a window of the site, to
// show it asks the registry rather than carrying a list of its own.
vi.mock("@/components/query-dialogs", () => ({
  QUERY_DIALOGS: {
    settings: () => null,
    news: () => null,
    rappel: () => null,
    duel: () => null,
    request: () => null,
    "fenetre-de-test": () => null,
  },
}));

const { WelcomeModal } = await import("../welcome-modal");

const CTA = { href: "/paths", label: "Voir les parcours" };

afterEach(cleanup);

beforeEach(() => {
  localStorage.clear();
  address.search = "";
});

describe("WelcomeModal", () => {
  it("opens the lesson the mission card offers", async () => {
    render(<WelcomeModal cta={{ href: "/lessons/adresses-ip", label: "Commencer la leçon" }} />);
    const link = await screen.findByRole("link", { name: /Commencer la leçon/ });
    expect(link.getAttribute("href")).toBe("/lessons/adresses-ip");
  });

  it("sends somebody with no path to the paths, as the card does", async () => {
    render(<WelcomeModal cta={{ href: "/paths", label: "Voir les parcours" }} />);
    const link = await screen.findByRole("link", { name: /Voir les parcours/ });
    expect(link.getAttribute("href")).toBe("/paths");
  });

  it("stays shut once seen", () => {
    localStorage.setItem("cl-welcome-seen", "1");
    render(<WelcomeModal cta={CTA} />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it.each(["settings", "news", "rappel", "duel", "request", "fenetre-de-test"])(
    "stays shut over the window ?%s=1 asks for, and is not marked as seen",
    async (key) => {
      address.search = `?${key}=1`;
      render(<WelcomeModal cta={CTA} />);
      // Let the effect run: a modal that was going to open has by now.
      await act(async () => {
        await Promise.resolve();
      });
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.queryByRole("link")).toBeNull();
      expect(localStorage.getItem("cl-welcome-seen")).toBeNull();
    },
  );

  it("shows on the next visit, to somebody who came for the window and never saw it", async () => {
    address.search = "?rappel=1";
    const first = render(<WelcomeModal cta={CTA} />);
    first.unmount();

    address.search = "";
    render(<WelcomeModal cta={CTA} />);
    expect(await screen.findByRole("link", { name: /Voir les parcours/ })).toBeTruthy();
  });

  it("does not open when the window is closed afterwards", async () => {
    address.search = "?rappel=1";
    const { rerender } = render(<WelcomeModal cta={CTA} />);

    // The recall is closed: the parameter leaves the address, the page stays.
    address.search = "";
    rerender(<WelcomeModal cta={CTA} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("still opens for an address that carries parameters no window owns", async () => {
    address.search = "?utm_source=mail&tab=1";
    render(<WelcomeModal cta={CTA} />);
    expect(await screen.findByRole("link", { name: /Voir les parcours/ })).toBeTruthy();
  });
});
