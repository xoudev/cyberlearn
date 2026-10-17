// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { profileTabHref } from "@cyberlearn/lib/social/profile-tabs";
import { ProfileContent } from "../profile-content";

/**
 * The profile's tabs live in the address: a link opens the profile on one of
 * them, a tab changes the address in place, and an address the page does not
 * know still opens it, on the badges.
 */

// Next follows the History API in useSearchParams; here the address is read
// the same way, again after each replaceState and popstate.
const address = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  return {
    listeners,
    notify(): void {
      for (const listener of listeners) listener();
    },
  };
});

vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  function subscribe(listener: () => void): () => void {
    address.listeners.add(listener);
    window.addEventListener("popstate", listener);
    return () => {
      address.listeners.delete(listener);
      window.removeEventListener("popstate", listener);
    };
  }
  return {
    useSearchParams: () =>
      new URLSearchParams(useSyncExternalStore(subscribe, () => window.location.search)),
  };
});

const replaceState = window.history.replaceState.bind(window.history);
/** Every address the component asked for, through the History API. */
let replaced: string[] = [];

beforeEach(() => {
  replaced = [];
  vi.spyOn(window.history, "replaceState").mockImplementation((state, unused, url) => {
    replaced.push(String(url));
    replaceState(state, unused, url);
    address.notify();
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  replaceState(null, "", "/");
});

function visit(href: string): void {
  replaceState(null, "", href);
}

function renderProfile(): void {
  render(
    <ProfileContent
      counts={{ activite: 4, badges: "3/24", certificats: 1 }}
      panels={{
        activite: <p>panneau activité</p>,
        badges: <p>panneau badges</p>,
        certificats: <p>panneau certificats</p>,
      }}
    />,
  );
}

/** The selected tab's label, without the figure beside it. */
function selectedTab(): string | null {
  const tab = screen
    .getAllByRole("tab")
    .find((candidate) => candidate.getAttribute("aria-selected") === "true");
  return tab?.textContent.replace(/\s*\d.*$/u, "") ?? null;
}

describe("ProfileContent", () => {
  it("opens on the badges when the address names no tab", () => {
    visit("/profile");
    renderProfile();
    expect(selectedTab()).toBe("Badges");
    expect(screen.getByText("panneau badges")).toBeTruthy();
    expect(screen.queryByText("panneau certificats")).toBeNull();
  });

  it("opens on the tab a link names", () => {
    visit(profileTabHref("certificats"));
    renderProfile();
    expect(selectedTab()).toBe("Certificats");
    expect(screen.getByRole("tabpanel", { name: "Certificats" }).textContent).toBe(
      "panneau certificats",
    );
  });

  it("opens on the badges for a tab it does not know", () => {
    visit("/profile?tab=parametres");
    renderProfile();
    expect(selectedTab()).toBe("Badges");
  });

  it("puts the tab chosen in the address, in place, and keeps the rest of it", () => {
    visit("/profile?settings=data");
    renderProfile();

    fireEvent.click(screen.getByRole("tab", { name: /Activité/ }));

    expect(replaced).toHaveLength(1);
    expect(window.location.pathname).toBe("/profile");
    const params = new URLSearchParams(window.location.search);
    expect(params.get("tab")).toBe("activite");
    expect(params.get("settings")).toBe("data");
    expect(selectedTab()).toBe("Activité");
    expect(screen.getByText("panneau activité")).toBeTruthy();
  });

  it("follows the address when it changes under it, as a link to another tab does", () => {
    visit("/profile?tab=activite");
    renderProfile();
    act(() => {
      visit(profileTabHref("badges"));
      address.notify();
    });
    expect(selectedTab()).toBe("Badges");
  });

  it("shows each tab's figure beside its label", () => {
    visit("/profile");
    renderProfile();
    expect(screen.getByRole("tab", { name: /Badges/ }).textContent).toContain("3/24");
    expect(screen.getByRole("tab", { name: /Certificats/ }).textContent).toContain("1");
  });
});
