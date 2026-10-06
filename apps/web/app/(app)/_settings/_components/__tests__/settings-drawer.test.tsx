// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SettingsData } from "../../_lib/settings-data";

/**
 * The settings drawer opens over the page without a navigation: a click on
 * any link to the settings is caught, the sections arrive in one request
 * (started on the hover), and picking a section asks for nothing.
 */

const nav = vi.hoisted(() => ({ pathname: "/dashboard", search: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

// The seven real sections are forms; here a stand-in shows what
// the drawer hands them, and asks for a reload the way a form does.
vi.mock("../SettingsPanels", async () => {
  const { useSettingsReload } = await import("../settings-reload");
  function Panels({ data, section }: { data: SettingsData; section: string }): React.JSX.Element {
    const reload = useSettingsReload();
    return (
      <div>
        <p>{`section:${section} nom:${data.profile.displayName}`}</p>
        <button type="button" onClick={reload}>
          recharger
        </button>
      </div>
    );
  }
  return { default: Panels };
});

import { SETTINGS_SECTIONS, settingsSection, settingsSectionFromHref } from "../sections";
import { SettingsDrawerProvider, useSettingsDrawer } from "../SettingsDrawer";

function payload(displayName = "Ada"): SettingsData {
  return {
    profile: {
      username: "ada",
      displayName,
      bio: "",
      avatarUrl: "/avatars/01.png",
      avatarPreview: null,
    },
    privacy: { visibility: "ANONYMOUS", publicProfile: true, friendsLeaderboard: false },
    preferences: { spacedRepetition: true },
    notifications: {
      reviewReminders: true,
      weeklyDigest: true,
      streakReminder: true,
      emailNotifications: true,
    },
    moderation: { events: [] },
    account: { email: "ada@example.test", emailConfirmed: true },
    data: { pendingExpiresAt: null, certificateCount: 0 },
  };
}

function answer(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

function OpenByHref({ href }: { href: string }): React.JSX.Element {
  const drawer = useSettingsDrawer();
  const [result, setResult] = React.useState("");
  return (
    <button
      type="button"
      onClick={() => {
        setResult(String(drawer?.openHref(href)));
      }}
    >
      {`ouvrir ${href} ${result}`}
    </button>
  );
}

/**
 * Clicks, and says whether the browser would have followed the link. The
 * listener sits last on the way up, after the drawer's and React's, and stops
 * jsdom from attempting a navigation it does not implement.
 */
function clickFollows(element: Element, init?: MouseEventInit): boolean {
  let prevented = false;
  const last = (event: Event): void => {
    prevented = event.defaultPrevented;
    event.preventDefault();
  };
  document.addEventListener("click", last);
  fireEvent.click(element, init);
  document.removeEventListener("click", last);
  return !prevented;
}

function renderSite(): ReturnType<typeof render> {
  return render(
    <SettingsDrawerProvider>
      <a href="/settings/privacy">vers la confidentialité</a>
      <a href="/settings">vers les paramètres</a>
      <a href="/settings/privacy" target="_blank" rel="noreferrer">
        dans un onglet
      </a>
      <a href="https://example.test/settings/privacy">vers un autre site</a>
      <OpenByHref href="/settings/moderation" />
      <OpenByHref href="/lessons" />
    </SettingsDrawerProvider>,
  );
}

beforeEach(() => {
  nav.pathname = "/dashboard";
  nav.search = "";
  window.history.replaceState({}, "", "/dashboard");
  fetchMock.mockReset();
  fetchMock.mockImplementation(() => Promise.resolve(answer(payload())));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.style.overflow = "";
});

describe("the settings sections", () => {
  it("are seven, data last and marked", () => {
    expect(SETTINGS_SECTIONS.map((s) => s.key)).toEqual([
      "profile",
      "privacy",
      "preferences",
      "notifications",
      "moderation",
      "account",
      "data",
    ]);
    expect(settingsSection("data")?.danger).toBe(true);
    expect(settingsSection("billing")).toBeUndefined();
  });

  it("are read from an address on this site only, the bare /settings being the first", () => {
    const origin = "https://cyberlearn.fr";
    expect(settingsSectionFromHref("/settings/privacy", origin)).toBe("privacy");
    expect(settingsSectionFromHref("https://cyberlearn.fr/settings/data/", origin)).toBe("data");
    expect(settingsSectionFromHref("/settings", origin)).toBe("profile");
    expect(settingsSectionFromHref("/settings/moderation?from=notice#top", origin)).toBe(
      "moderation",
    );
    expect(settingsSectionFromHref("/settings/billing", origin)).toBeNull();
    expect(settingsSectionFromHref("/settings/privacy/extra", origin)).toBeNull();
    expect(settingsSectionFromHref("/settingsx", origin)).toBeNull();
    expect(settingsSectionFromHref("/lessons", origin)).toBeNull();
    expect(settingsSectionFromHref("https://evil.example/settings/privacy", origin)).toBeNull();
  });
});

describe("the settings drawer", () => {
  it("opens on the linked section at a click, without following the link", async () => {
    renderSite();
    expect(clickFollows(screen.getByText("vers la confidentialité"))).toBe(false);
    expect(screen.getByRole("dialog", { name: "Paramètres" })).toBeTruthy();
    expect(await screen.findByText("section:privacy nom:Ada")).toBeTruthy();
    expect(screen.getByText("@ada")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/me/settings", { cache: "no-store" });
  });

  it("opens /settings on its first section", async () => {
    renderSite();
    fireEvent.click(screen.getByText("vers les paramètres"));
    expect(await screen.findByText("section:profile nom:Ada")).toBeTruthy();
  });

  it("starts loading on the hover, and the click uses that request", async () => {
    renderSite();
    fireEvent.pointerOver(screen.getByText("vers la confidentialité"));
    fireEvent.pointerOver(screen.getByText("vers la confidentialité"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.click(screen.getByText("vers la confidentialité"));
    expect(await screen.findByText("section:privacy nom:Ada")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("switches sections as a change of state, with nothing asked of the server", async () => {
    renderSite();
    fireEvent.click(screen.getByText("vers la confidentialité"));
    await screen.findByText("section:privacy nom:Ada");
    fireEvent.click(screen.getByRole("button", { name: /Données/ }));
    expect(await screen.findByText("section:data nom:Ada")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Données/ }).getAttribute("aria-current")).toBe(
      "true",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape and gives focus back to the link it was opened from", async () => {
    renderSite();
    const link = screen.getByText("vers la confidentialité");
    link.focus();
    fireEvent.click(link);
    await screen.findByText("section:privacy nom:Ada");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(link);
  });

  it("closes on its button, and asks again at the next opening", async () => {
    renderSite();
    fireEvent.click(screen.getByText("vers la confidentialité"));
    await screen.findByText("section:privacy nom:Ada");
    fireEvent.click(screen.getByRole("button", { name: "Fermer les paramètres" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    fetchMock.mockImplementation(() => Promise.resolve(answer(payload("Grace"))));
    fireEvent.click(screen.getByText("vers la confidentialité"));
    expect(await screen.findByText("section:privacy nom:Grace")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("leaves a modified click, a new tab and another site to the browser", () => {
    renderSite();
    expect(clickFollows(screen.getByText("vers la confidentialité"), { ctrlKey: true })).toBe(true);
    expect(clickFollows(screen.getByText("dans un onglet"))).toBe(true);
    expect(clickFollows(screen.getByText("vers un autre site"))).toBe(true);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("opens on the section the address asks for, then takes the request off it", async () => {
    // Where /settings/notifications lands, from an e-mail: next.config sends
    // it to /dashboard?settings=notifications.
    nav.search = "?settings=notifications&tab=2";
    window.history.replaceState({}, "", "/dashboard?settings=notifications&tab=2#haut");
    renderSite();
    expect(await screen.findByText("section:notifications nom:Ada")).toBeTruthy();
    const { pathname, search, hash } = window.location;
    expect(`${pathname}${search}${hash}`).toBe("/dashboard?tab=2#haut");
  });

  it("ignores a section it does not know in the address, and still takes it off", () => {
    nav.search = "?settings=billing";
    window.history.replaceState({}, "", "/dashboard?settings=billing");
    renderSite();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(window.location.search).toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("opens from an address handed to it, and says when it does not", async () => {
    renderSite();
    fireEvent.click(screen.getByText(/ouvrir \/lessons/));
    expect(screen.getByText("ouvrir /lessons false")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByText(/ouvrir \/settings\/moderation/));
    expect(await screen.findByText("section:moderation nom:Ada")).toBeTruthy();
  });

  it("says when the sections could not be loaded, and tries again on request", async () => {
    fetchMock.mockImplementationOnce(() => Promise.resolve(answer({ error: "unavailable" }, 500)));
    renderSite();
    fireEvent.click(screen.getByText("vers la confidentialité"));
    expect(await screen.findByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByText("section:privacy nom:Ada")).toBeTruthy();
  });

  it("refuses a payload it does not understand rather than rendering it", async () => {
    fetchMock.mockImplementationOnce(() => Promise.resolve(answer({ profile: { username: 1 } })));
    renderSite();
    fireEvent.click(screen.getByText("vers la confidentialité"));
    expect(await screen.findByRole("alert")).toBeTruthy();
  });

  it("reloads its sections when a form asks, without closing", async () => {
    renderSite();
    fireEvent.click(screen.getByText("vers la confidentialité"));
    await screen.findByText("section:privacy nom:Ada");
    fetchMock.mockImplementation(() => Promise.resolve(answer(payload("Grace"))));
    fireEvent.click(screen.getByRole("button", { name: "recharger" }));
    expect(await screen.findByText("section:privacy nom:Grace")).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("is closed for good by a navigation, even back to the page it opened over", async () => {
    const view = renderSite();
    fireEvent.click(screen.getByText("vers la confidentialité"));
    await screen.findByText("section:privacy nom:Ada");

    nav.pathname = "/lessons";
    view.rerender(
      <SettingsDrawerProvider>
        <p>leçons</p>
      </SettingsDrawerProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();

    nav.pathname = "/dashboard";
    view.rerender(
      <SettingsDrawerProvider>
        <p>tableau de bord</p>
      </SettingsDrawerProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("has no way out to a settings page, there is none", async () => {
    renderSite();
    fireEvent.click(screen.getByText("vers la confidentialité"));
    await screen.findByText("section:privacy nom:Ada");
    expect(screen.queryByText(/page complète/)).toBeNull();
    expect(screen.getByRole("dialog").querySelector("a[href]")).toBeNull();
  });
});
