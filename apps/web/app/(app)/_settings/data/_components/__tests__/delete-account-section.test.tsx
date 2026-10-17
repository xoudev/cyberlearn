// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SettingsData } from "../../../_lib/settings-data";

/**
 * The deletion dialog links to the certificates, a tab of the profile. The
 * profile's own "Éditer le profil" opens the settings drawer over /profile,
 * so following that link changes the tab under the drawer and not the
 * pathname: the drawer has to close itself, or it stays over the tab.
 */

const nav = vi.hoisted(() => ({ pathname: "/profile", followed: [] as string[] }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));
// Next's Link runs the caller's onClick, then navigates in place: the
// address changes, the pathname here does not.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  }) => (
    <a
      href={href}
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
        nav.followed.push(href);
      }}
    >
      {children}
    </a>
  ),
}));
vi.mock("../../_actions/request-deletion", () => ({
  requestDeletionAction: vi.fn(() => Promise.resolve({})),
}));
// The drawer's sections, reduced to the deletion card of the data section.
// The card is imported below, and only read when the drawer draws it.
vi.mock("../../../_components/SettingsPanels", () => ({
  default: function Panels({ data }: { data: SettingsData }): React.JSX.Element {
    return (
      <DeleteAccountSection
        pendingExpiresAt={data.data.pendingExpiresAt}
        certificateCount={data.data.certificateCount}
      />
    );
  },
}));

import { SettingsDrawerProvider } from "../../../_components/SettingsDrawer";
import { DeleteAccountSection } from "../DeleteAccountSection";

function payload(): SettingsData {
  return {
    profile: {
      username: "ada",
      displayName: "Ada",
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
    account: { email: "ada@example.test", emailConfirmed: true, canDisableMfa: true },
    data: { pendingExpiresAt: null, certificateCount: 2 },
  };
}

beforeEach(() => {
  nav.pathname = "/profile";
  nav.followed = [];
  window.history.replaceState({}, "", "/profile?tab=badges");
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(payload()), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.style.overflow = "";
});

describe("the certificates link of the account deletion", () => {
  it("closes the drawer opened over the profile, where the pathname stays the same", async () => {
    render(
      <SettingsDrawerProvider>
        <a href="/settings/profile">Éditer le profil</a>
      </SettingsDrawerProvider>,
    );
    const edit = screen.getByText("Éditer le profil");
    edit.focus();
    fireEvent.click(edit);
    expect(screen.getByRole("dialog", { name: "Paramètres" })).toBeTruthy();

    fireEvent.click(await screen.findByRole("button", { name: /Demander la suppression/ }));
    const link = screen.getByRole("link", { name: /Voir mes certificats/ });
    expect(link.getAttribute("href")).toBe("/profile?tab=certificats");

    fireEvent.click(link);
    expect(nav.followed).toEqual(["/profile?tab=certificats"]);
    // Neither the confirmation nor the drawer under it is left over the tab.
    expect(screen.queryByRole("dialog")).toBeNull();
    // As after a navigation, the focus is not handed back to the opener.
    expect(document.activeElement).not.toBe(edit);
  });
});
